const SUPABASE_URL =
"https://wlsfdjcrruupcixqaqgz.supabase.co";

const SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsc2ZkamNycnV1cGNpeHFhcWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3Nzk4MjEsImV4cCI6MjA5NDM1NTgyMX0.1dvt_9Uja-NVrILIanRjuighwcN5EwgKhgEBs95KLR4";

const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

async function fazerLogin(){

    const usuario =
    document.getElementById("usuario").value;

    const senha =
    document.getElementById("senha").value;

    const { data, error } =
    await supabaseClient
    .from("usuarios")
    .select("*")
    .eq("username", usuario)
    .eq("senha", senha)
    .single();

    if(error || !data){

        alert("Usuário ou senha inválidos");

        return;
    }

    document.getElementById("login")
    .style.display = "none";

    document.getElementById("sistema")
    .style.display = "block";
}
