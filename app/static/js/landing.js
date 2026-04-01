const API = '';

function showAlert(elementId, message, isSuccess) {
    const alert = document.getElementById(elementId);
    alert.textContent = message;
    alert.className = isSuccess ? 'alert-vs success mb-3' : 'alert-vs mb-3';
    alert.style.display = 'block';
    setTimeout(function() { alert.style.display = 'none'; }, 5000);
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showAlert('login-alert', 'Ingresa tu correo y contrasena', false);
        return;
    }

    const btn = document.getElementById('btn-login');
    const text = document.getElementById('login-text');
    const spinner = document.getElementById('login-spinner');

    btn.disabled = true;
    text.style.display = 'none';
    spinner.style.display = 'inline-block';

    try {
        const res = await fetch(API + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });

        const data = await res.json();

        if (!res.ok) {
            showAlert('login-alert', data.error || 'Error al iniciar sesion', false);
            return;
        }

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));

        window.location.href = '/dashboard';

    } catch (err) {
        showAlert('login-alert', 'Error de conexion con el servidor', false);
    } finally {
        btn.disabled = false;
        text.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

async function handleGoogleLogin() {
    try {
        const res = await fetch(API + '/api/auth/google/login');
        const data = await res.json();

        if (data.auth_url) {
            window.location.href = data.auth_url;
        } else {
            showAlert('login-alert', 'Error al conectar con Google', false);
        }
    } catch (err) {
        showAlert('login-alert', 'Error de conexion con el servidor', false);
    }
}

document.getElementById('login-password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleLogin();
});