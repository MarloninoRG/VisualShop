/* Verificar autenticacion */
function checkAuth() {
    const token = localStorage.getItem('access_token');
    const usuario = localStorage.getItem('usuario');

    if (!token || !usuario) {
        window.location.href = '/';
        return null;
    }

    return JSON.parse(usuario);
}

/* Cargar datos del usuario en el sidebar */
function loadUserInfo() {
    const usuario = checkAuth();
    if (!usuario) return;

    var nombre = usuario.nombre || 'Usuario';
    var iniciales = nombre.split(' ').map(function(n) { return n[0]; }).join('').substring(0, 2).toUpperCase();

    document.getElementById('user-avatar').textContent = iniciales;
    document.getElementById('user-name').textContent = nombre;
    document.getElementById('user-role').textContent = usuario.rol;

    /* Ocultar menu de usuarios si no es admin */
    var navUsuarios = document.getElementById('nav-usuarios');
    if (navUsuarios && usuario.rol !== 'admin') {
        navUsuarios.style.display = 'none';
    }
}

/* Toggle sidebar en mobile */
function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');
}

/* Cerrar sesion */
function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('usuario');
    window.location.href = '/';
}

/* Hacer peticiones autenticadas a la API */
async function apiFetch(url, options) {
    var token = localStorage.getItem('access_token');

    if (!options) options = {};
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = 'Bearer ' + token;
    options.headers['Content-Type'] = 'application/json';

    var res = await fetch(url, options);

    if (res.status === 401) {
        handleLogout();
        return null;
    }

    return res;
}

/* Formatear dinero */
function formatMoney(amount) {
    return '$' + Number(amount).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/* Cargar info al abrir la pagina */
document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
});