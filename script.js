const SUPABASE_URL = "https://wlsfdjcrruupcixqaqgz.supabase.co";
const SUPABASE_KEY = "sb_publishable_fnMFns1HeZLnfkBVHtvxpg_w_H4CGG7";

const supa = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioLogado = null;
let imagensSelecionadas = [];
let imagensAtuais = [];
let registrosFiltrados = [];

/* LOGIN */

async function fazerLogin(){
  const usuario = document.getElementById("loginUsuario").value.trim();
  const senha = document.getElementById("loginSenha").value.trim();

  const { data, error } = await supa
    .from("usuarios")
    .select("*")
    .eq("username", usuario)
    .eq("senha", senha)
    .maybeSingle();

  if(error){
    console.log(error);
    alert("Erro ao fazer login.");
    return;
  }

  if(!data){
    alert("Usuário ou senha inválidos.");
    return;
  }

  usuarioLogado = data;

  document.getElementById("loginTela").classList.add("hidden");
  document.getElementById("menuLateral").style.display = "flex";

  document.getElementById("usuarioInfo").innerHTML =
    "Usuário: <b>" + data.username + "</b><br>Tipo: <b>" + data.role + "</b>";

  if(data.role === "admin"){
    document.getElementById("btnUsuarios").style.display = "block";
  }

  mostrarAba("dashboard");
  carregarDashboard();
}

function sair(){
  location.reload();
}

/* ABAS */

function mostrarAba(aba){
  document.querySelectorAll(".aba").forEach(el => {
    el.classList.add("hidden");
  });

  document.getElementById(aba).classList.remove("hidden");

  if(aba === "dashboard") carregarDashboard();
  if(aba === "cadastro") carregarProdutos();
  if(aba === "registros") carregarEntradas();
  if(aba === "usuarios") carregarUsuarios();
}

/* FOTOS */

function abrirOpcoesFoto(){
  document.getElementById("modalFoto").style.display = "flex";
}

function fecharOpcoesFoto(){
  document.getElementById("modalFoto").style.display = "none";
}

function abrirGaleria(){
  fecharOpcoesFoto();
  document.getElementById("inputGaleria").click();
}

function abrirCamera(){
  fecharOpcoesFoto();
  document.getElementById("inputCamera").click();
}

function selecionarImagens(event){
  const arquivos = Array.from(event.target.files || []);

  if(arquivos.length === 0) return;

  imagensSelecionadas = imagensSelecionadas.concat(arquivos);
  atualizarPreviewImagens();
}

function atualizarPreviewImagens(){
  const preview = document.getElementById("previewFotoProduto");
  const galeria = document.getElementById("galeriaPreview");

  const atuais = imagensAtuais.map(url => ({ tipo:"url", valor:url }));
  const novas = imagensSelecionadas.map(file => ({ tipo:"file", valor:file }));
  const todas = atuais.concat(novas);

  galeria.innerHTML = "";

  if(todas.length === 0){
    preview.innerHTML = "+";
    return;
  }

  const primeira = todas[0];

  if(primeira.tipo === "url"){
    preview.innerHTML = <img src="${primeira.valor}">;
  }else{
    preview.innerHTML = <img src="${URL.createObjectURL(primeira.valor)}">;
  }

  todas.forEach((item, index) => {
    const src = item.tipo === "url"
      ? item.valor
      : URL.createObjectURL(item.valor);

    galeria.innerHTML += `
      <div class="galeria-item" onclick="definirImagemPrincipal(${index})">
        <img src="${src}">
        <button onclick="event.stopPropagation(); removerImagemPreview(${index})">×</button>
      </div>
    `;
  });
}

function definirImagemPrincipal(index){
  const totalAtuais = imagensAtuais.length;

  if(index < totalAtuais){
    const img = imagensAtuais.splice(index, 1)[0];
    imagensAtuais.unshift(img);
  }else{
    const pos = index - totalAtuais;
    const img = imagensSelecionadas.splice(pos, 1)[0];
    imagensSelecionadas.unshift(img);
  }

  atualizarPreviewImagens();
}

function removerImagemPreview(index){
  const totalAtuais = imagensAtuais.length;

  if(index < totalAtuais){
    imagensAtuais.splice(index, 1);
  }else{
    imagensSelecionadas.splice(index - totalAtuais, 1);
  }

  atualizarPreviewImagens();
}

function normalizarImagens(valor, imagemUrl){
  let imagens = [];

  if(Array.isArray(valor)){
    imagens = valor;
  }else if(typeof valor === "string" && valor.trim()){
    try{
      const convertido = JSON.parse(valor);
      imagens = Array.isArray(convertido) ? convertido : [valor];
    }catch(e){
      imagens = [valor];
    }
  }

  if(imagemUrl && !imagens.includes(imagemUrl)){
    imagens.unshift(imagemUrl);
  }

  return imagens.filter(Boolean);
}

function imagensParaBanco(lista){
  return JSON.stringify(lista.filter(Boolean));
}

async function uploadImagemUnica(arquivo){
  const extensao = arquivo.name.split(".").pop();
  const nomeArquivo =
    "produto_" +
    Date.now() +
    "_" +
    Math.random().toString(36).substring(2) +
    "." +
    extensao;

  const { error } = await supa.storage
    .from("produtos")
    .upload(nomeArquivo, arquivo, {
      cacheControl:"3600",
      upsert:true
    });

  if(error){
    console.log(error);
    throw error;
  }

  const { data } = supa.storage
    .from("produtos")
    .getPublicUrl(nomeArquivo);

  return data.publicUrl;
}

async function uploadImagensProduto(){
  const urlsNovas = [];

  for(const arquivo of imagensSelecionadas){
    const url = await uploadImagemUnica(arquivo);
    urlsNovas.push(url);
  }

  return imagensAtuais.concat(urlsNovas);
}

function miniatura(url){
  if(url){
    return <img class="thumb" src="${url}">;
  }

  return <div class="sem-foto">+</div>;
}

/* PRODUTOS */

async function salvarProduto(){
  const id = document.getElementById("produtoId").value;

  const codigo = document.getElementById("produtoCodigo").value.trim();
  const descricao = document.getElementById("produtoDescricao").value.trim();
  const unidade = document.getElementById("produtoUnidade").value;

  if(!codigo || !descricao || !unidade){
    alert("Preencha código, descrição e tipo.");
    return;
  }

  let todasImagens = [];

  try{
    todasImagens = await uploadImagensProduto();
  }catch(e){
    alert("Erro ao enviar imagem.");
    return;
  }

  const dados = {
    codigo,
    descricao,
    unidade,
    imagem_url: todasImagens[0] || "",
    imagens: imagensParaBanco(todasImagens)
  };

  let error;

  if(id){
    ({ error } = await supa
      .from("produtos")
      .update(dados)
      .eq("id", id));
  }else{
    ({ error } = await supa
      .from("produtos")
      .insert([dados]));
  }

  if(error){
    console.log(error);
    alert("Erro ao salvar produto.");
    return;
  }

  alert("Produto salvo com sucesso!");
  limparProduto();
  carregarProdutos();
  carregarDashboard();
}

async function carregarProdutos(){
  const { data, error } = await supa
    .from("produtos")
    .select("*")
    .order("id", { ascending:false });

  if(error){
    console.log(error);
    return;
  }

  const lista = document.getElementById("listaProdutos");
  lista.innerHTML = "";

  data.forEach(p => {
    const imgs = normalizarImagens(p.imagens, p.imagem_url);
    const foto = imgs[0] || "";

    lista.innerHTML += `
      <tr>
        <td>${miniatura(foto)}</td>
        <td>${p.codigo || ""}</td>
        <td>${p.descricao || ""}</td>
        <td>${p.unidade || ""}</td>
        <td>
          <button onclick="editarProduto(${p.id})">Editar</button>
          <button class="vermelho" onclick="excluirProduto(${p.id})">Excluir</button>
        </td>
      </tr>
    `;
  });
}

async function editarProduto(id){
  const { data, error } = await supa
    .from("produtos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if(error || !data){
    alert("Produto não encontrado.");
    return;
  }

  document.getElementById("produtoId").value = data.id;
  document.getElementById("produtoCodigo").value = data.codigo || "";
  document.getElementById("produtoDescricao").value = data.descricao || "";
  document.getElementById("produtoUnidade").value = data.unidade || "";

  imagensAtuais = normalizarImagens(data.imagens, data.imagem_url);
  imagensSelecionadas = [];

  atualizarPreviewImagens();
}

async function excluirProduto(id){
  if(!confirm("Excluir produto?")) return;

  const { error } = await supa
    .from("produtos")
    .delete()
    .eq("id", id);

  if(error){
    console.log(error);
    alert("Erro ao excluir produto.");
    return;
  }

  carregarProdutos();
  carregarDashboard();
}

async function excluirProdutoSelecionado(){
  const id = document.getElementById("produtoId").value;

  if(!id){
    alert("Selecione um produto na lista para excluir.");
    return;
  }

  await excluirProduto(id);
  limparProduto();
}

function limparProduto(){
  document.getElementById("produtoId").value = "";
  document.getElementById("produtoCodigo").value = "";
  document.getElementById("produtoDescricao").value = "";
  document.getElementById("produtoUnidade").value = "";

  imagensSelecionadas = [];
  imagensAtuais = [];

  document.getElementById("inputGaleria").value = "";
  document.getElementById("inputCamera").value = "";
  document.getElementById("previewFotoProduto").innerHTML = "+";
  document.getElementById("galeriaPreview").innerHTML = "";
}

/* REGISTRAR ENTRADA */

async function buscarProdutoPorCodigo(){
  const codigo = document.getElementById("entradaCodigo").value.trim();

  if(!codigo) return;

  const { data, error } = await supa
    .from("produtos")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();

  if(error){
    console.log(error);
    return;
  }

  if(!data){
    alert("Produto não encontrado no cadastro.");
    return;
  }

  document.getElementById("entradaDescricao").value = data.descricao || "";
  document.getElementById("entradaUnidade").value = data.unidade || "";
}

document.addEventListener("change", function(e){
  if(e.target && e.target.id === "entradaData"){
    preencherMesEntrada();
  }
});

function preencherMesEntrada(){
  const data = document.getElementById("entradaData").value;

  if(!data) return;

  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];

  const d = new Date(data + "T00:00:00");
  document.getElementById("entradaMes").value = meses[d.getMonth()];
}

async function registrarEntrada(){
  const data = document.getElementById("entradaData").value;

  if(!data){
    alert("Informe a data.");
    return;
  }

  preencherMesEntrada();

  const d = new Date(data + "T00:00:00");

  const dados = {
    codigo: document.getElementById("entradaCodigo").value.trim(),
    descricao: document.getElementById("entradaDescricao").value.trim(),
    unidade: document.getElementById("entradaUnidade").value.trim(),
    numero_pedido: document.getElementById("entradaPedido").value.trim(),
    numero_op: document.getElementById("entradaOP").value.trim(),
    lote: document.getElementById("entradaLote").value.trim(),
    quantidade: Number(document.getElementById("entradaQuantidade").value || 0),
    tipo_entrada: document.getElementById("entradaTipo").value,
    data: data,
    mes: document.getElementById("entradaMes").value,
    ano: d.getFullYear()
  };

  if(!dados.codigo || !dados.descricao || !dados.quantidade){
    alert("Preencha código, descrição e quantidade.");
    return;
  }

  const { error } = await supa
    .from("entradas")
    .insert([dados]);

  if(error){
    console.log(error);
    alert("Erro ao registrar entrada.");
    return;
  }

  alert("Entrada registrada com sucesso!");
  limparEntrada();
  carregarDashboard();
}

function limparEntrada(){
  document.getElementById("entradaCodigo").value = "";
  document.getElementById("entradaDescricao").value = "";
  document.getElementById("entradaUnidade").value = "";
  document.getElementById("entradaPedido").value = "";
  document.getElementById("entradaOP").value = "";
  document.getElementById("entradaLote").value = "";
  document.getElementById("entradaQuantidade").value = "";
  document.getElementById("entradaTipo").value = "Entrada";
  document.getElementById("entradaData").value = "";
  document.getElementById("entradaMes").value = "";
}

/* REGISTROS */

async function carregarEntradas(){
  const { data, error } = await supa
    .from("entradas")
    .select("*")
    .order("data", { ascending:false });

  if(error){
    console.log(error);
    return;
  }

  registrosFiltrados = data || [];
  montarTabelaEntradas(registrosFiltrados);
}

function montarTabelaEntradas(lista){
  const tabela = document.getElementById("listaEntradas");
  tabela.innerHTML = "";

  let totalProdutos = 0;

  lista.forEach(e => {
    totalProdutos += Number(e.quantidade || 0);

    tabela.innerHTML += `
      <tr>
        <td>${e.codigo || ""}</td>
        <td>${e.descricao || ""}</td>
        <td>${e.unidade || ""}</td>
        <td>${e.numero_pedido || ""}</td>
        <td>${e.numero_op || ""}</td>
        <td>${e.lote || ""}</td>
        <td>${Number(e.quantidade || 0).toLocaleString("pt-BR")}</td>
        <td>${e.tipo_entrada || ""}</td>
        <td>${formatarData(e.data)}</td>
        <td>${e.mes || ""}</td>
      </tr>
    `;
  });

  document.getElementById("totalFichasFiltro").textContent = lista.length;
  document.getElementById("totalProdutosFiltro").textContent =
    totalProdutos.toLocaleString("pt-BR");
}

function dataInicioDia(data){
  const d = new Date(data);
  d.setHours(0,0,0,0);
  return d;
}

async function filtrarRegistros(tipo){
  const { data, error } = await supa
    .from("entradas")
    .select("*")
    .order("data", { ascending:false });

  if(error){
    console.log(error);
    return;
  }

  const hoje = dataInicioDia(new Date());

  const filtrados = (data || []).filter(item => {
    if(!item.data) return false;

    const dataItem = dataInicioDia(item.data + "T00:00:00");

    if(tipo === "todos") return true;

    if(tipo === "semana"){
      const semana = new Date(hoje);
      semana.setDate(hoje.getDate() - 7);
      return dataItem >= semana && dataItem <= hoje;
    }

    if(tipo === "mes"){
      return dataItem.getMonth() === hoje.getMonth() &&
             dataItem.getFullYear() === hoje.getFullYear();
    }

    if(tipo === "ano"){
      return dataItem.getFullYear() === hoje.getFullYear();
    }

    return true;
  });

  registrosFiltrados = filtrados;
  montarTabelaEntradas(filtrados);
}

async function filtrarRegistrosPorData(){
  const dataFiltro = document.getElementById("dataFiltroRegistro").value;

  if(!dataFiltro){
    alert("Escolha uma data.");
    return;
  }

  const { data, error } = await supa
    .from("entradas")
    .select("*")
    .eq("data", dataFiltro)
    .order("data", { ascending:false });

  if(error){
    console.log(error);
    return;
  }

  registrosFiltrados = data || [];
  montarTabelaEntradas(registrosFiltrados);
}

function imprimirRelatorio(){
  const conteudo = document.getElementById("tabelaRelatorio").outerHTML;
  const fichas = document.getElementById("totalFichasFiltro").textContent;
  const total = document.getElementById("totalProdutosFiltro").textContent;

  const janela = window.open("", "_blank");

  janela.document.write(`
    <html>
    <head>
      <title>Relatório de Entradas</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: Arial; color:#333; }
        h1 { color:#5a4fa3; }
        table { width:100%; border-collapse:collapse; font-size:12px; }
        th { background:#5a4fa3; color:white; padding:6px; }
        td { border:1px solid #ddd; padding:6px; }
        .resumo { margin:15px 0; font-size:16px; }
      </style>
    </head>
    <body>
      <h1>Sofisticatto Cosméticos</h1>
      <h2>Relatório de Entradas</h2>

      <div class="resumo">
        <b>Quantidade de fichas:</b> ${fichas}<br>
        <b>Total de produtos acabados:</b> ${total}
      </div>

      ${conteudo}

      <script>
        window.print();
      <\/script>
    </body>
    </html>
  `);

  janela.document.close();
}

/* PESQUISA POR PRODUTO */

async function pesquisarProduto(){
  const codigo = document.getElementById("pesquisaCodigo").value.trim();
  const ano = Number(document.getElementById("pesquisaAno").value);

  if(!codigo || !ano){
    alert("Informe o código e o ano.");
    return;
  }

  const { data, error } = await supa
    .from("entradas")
    .select("*")
    .eq("codigo", codigo)
    .eq("ano", ano)
    .order("data", { ascending:true });

  if(error){
    console.log(error);
    alert("Erro na pesquisa.");
    return;
  }

  montarResumoProduto(data || []);
  montarDetalheProduto(data || []);
}

function montarResumoProduto(lista){
  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];

  const resumo = {};

  meses.forEach(m => {
    resumo[m] = {
      qtd:0,
      fichas:0,
      descricao:""
    };
  });

  let totalAno = 0;

  lista.forEach(item => {
    const mes = item.mes || "";
    if(!resumo[mes]) return;

    resumo[mes].qtd += Number(item.quantidade || 0);
    resumo[mes].fichas += 1;
    resumo[mes].descricao = item.descricao || "";
    totalAno += Number(item.quantidade || 0);
  });

  const tabela = document.getElementById("resumoProdutoMes");
  tabela.innerHTML = "";

  meses.forEach(m => {
    if(resumo[m].qtd > 0 || resumo[m].fichas > 0){
      tabela.innerHTML += `
        <tr>
          <td>${resumo[m].descricao}</td>
          <td>${m}</td>
          <td>${resumo[m].qtd.toLocaleString("pt-BR")}</td>
          <td>${resumo[m].fichas}</td>
        </tr>
      `;
    }
  });

  const mesesComProducao = Object.values(resumo).filter(r => r.qtd > 0).length || 1;

  document.getElementById("pesquisaTotalAno").textContent =
    totalAno.toLocaleString("pt-BR");

  document.getElementById("pesquisaMediaMes").textContent =
    (totalAno / mesesComProducao).toLocaleString("pt-BR", { maximumFractionDigits:2 });

  document.getElementById("pesquisaMediaDia").textContent =
    (totalAno / 365).toLocaleString("pt-BR", { maximumFractionDigits:2 });
}

function montarDetalheProduto(lista){
  const tabela = document.getElementById("detalheProduto");
  tabela.innerHTML = "";

  lista.forEach(e => {
    tabela.innerHTML += `
      <tr>
        <td>${e.codigo || ""}</td>
        <td>${e.descricao || ""}</td>
        <td>${e.unidade || ""}</td>
        <td>${e.numero_pedido || ""}</td>
        <td>${e.numero_op || ""}</td>
        <td>${e.lote || ""}</td>
        <td>${Number(e.quantidade || 0).toLocaleString("pt-BR")}</td>
        <td>${e.tipo_entrada || ""}</td>
        <td>${formatarData(e.data)}</td>
        <td>${e.mes || ""}</td>
      </tr>
    `;
  });
}

function limparPesquisa(){
  document.getElementById("pesquisaCodigo").value = "";
  document.getElementById("pesquisaAno").value = "";
  document.getElementById("resumoProdutoMes").innerHTML = "";
  document.getElementById("detalheProduto").innerHTML = "";
  document.getElementById("pesquisaTotalAno").textContent = "0";
  document.getElementById("pesquisaMediaMes").textContent = "0";
  document.getElementById("pesquisaMediaDia").textContent = "0";
}

/* USUÁRIOS */

async function salvarUsuario(){
  const id = document.getElementById("usuarioId").value;

  const dados = {
    username: document.getElementById("novoUsuario").value.trim(),
    senha: document.getElementById("novaSenha").value.trim(),
    role: document.getElementById("novoRole").value
  };

  if(!dados.username || !dados.senha){
    alert("Preencha usuário e senha.");
    return;
  }

  let error;

  if(id){
    ({ error } = await supa
      .from("usuarios")
      .update(dados)
      .eq("id", id));
  }else{
    ({ error } = await supa
      .from("usuarios")
      .insert([dados]));
  }

  if(error){
    console.log(error);
    alert("Erro ao salvar usuário.");
    return;
  }

  alert("Usuário salvo!");
  limparUsuario();
  carregarUsuarios();
}

async function carregarUsuarios(){
  const { data, error } = await supa
    .from("usuarios")
    .select("*")
    .order("id", { ascending:false });

  if(error){
    console.log(error);
    return;
  }

  const lista = document.getElementById("listaUsuarios");
  lista.innerHTML = "";

  data.forEach(u => {
    lista.innerHTML += `
      <tr>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>
          <button onclick="editarUsuario(${u.id})">Editar</button>
          <button class="vermelho" onclick="excluirUsuario(${u.id})">Excluir</button>
        </td>
      </tr>
    `;
  });
}

async function editarUsuario(id){
  const { data, error } = await supa
    .from("usuarios")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if(error || !data) return;

  document.getElementById("usuarioId").value = data.id;
  document.getElementById("novoUsuario").value = data.username || "";
  document.getElementById("novaSenha").value = data.senha || "";
  document.getElementById("novoRole").value = data.role || "operador";
}

async function excluirUsuario(id){
  if(!confirm("Excluir usuário?")) return;

  const { error } = await supa
    .from("usuarios")
    .delete()
    .eq("id", id);

  if(error){
    console.log(error);
    alert("Erro ao excluir usuário.");
    return;
  }

  carregarUsuarios();
}

function limparUsuario(){
  document.getElementById("usuarioId").value = "";
  document.getElementById("novoUsuario").value = "";
  document.getElementById("novaSenha").value = "";
  document.getElementById("novoRole").value = "operador";
}

/* DASHBOARD */

async function carregarDashboard(){
  const { data: produtos } = await supa
    .from("produtos")
    .select("*");

  const { data: entradas } = await supa
    .from("entradas")
    .select("*");

  document.getElementById("totalProdutos").textContent =
    produtos ? produtos.length : 0;

  document.getElementById("totalEntradas").textContent =
    entradas ? entradas.length : 0;

  const total = (entradas || []).reduce((soma, item) => {
    return soma + Number(item.quantidade || 0);
  }, 0);

  document.getElementById("totalProduzido").textContent =
    total.toLocaleString("pt-BR");
}

/* HELPERS */

function formatarData(data){
  if(!data) return "";
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

window.onload = function(){
  const hoje = new Date().toISOString().split("T")[0];
  const dataEntrada = document.getElementById("entradaData");

  if(dataEntrada){
    dataEntrada.value = hoje;
    preencherMesEntrada();
  }
};
