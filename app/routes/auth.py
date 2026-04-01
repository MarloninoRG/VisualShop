from flask import Blueprint, request, jsonify, redirect, url_for
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity
)
import requests as http_requests
import os
from app import db, bcrypt
from app.models.usuario import Usuario

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
GOOGLE_DISCOVERY_URL = 'https://accounts.google.com/.well-known/openid-configuration'


@auth_bp.route('/setup', methods=['POST'])
def setup_admin():
    """Crear el primer administrador. Solo funciona si no hay ningun usuario.

    Este endpoint se usa UNA SOLA VEZ cuando se instala la app.
    Despues de crear el primer admin, se desactiva automaticamente.

    Espera:
    {
        "nombre": "Carlos Dueno",
        "email": "carlos@gmail.com",
        "password": "123456"
    }
    """
    if Usuario.query.first():
        return jsonify({'error': 'Ya existe un administrador. Usa /login para entrar.'}), 403

    data = request.get_json()

    if not data:
        return jsonify({'error': 'No se enviaron datos'}), 400

    nombre = data.get('nombre')
    email = data.get('email')
    password = data.get('password')

    if not nombre or not email or not password:
        return jsonify({'error': 'Faltan campos: nombre, email, password'}), 400

    password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    admin = Usuario(
        nombre=nombre,
        email=email,
        password=password_hash,
        rol='admin'
    )

    db.session.add(admin)
    db.session.commit()

    access_token = create_access_token(identity=str(admin.id))
    refresh_token = create_refresh_token(identity=str(admin.id))

    return jsonify({
        'mensaje': 'Administrador creado exitosamente. Este endpoint ya no funcionara.',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'usuario': admin.to_dict()
    }), 201


@auth_bp.route('/register', methods=['POST'])
@jwt_required()
def register():
    """Registrar un nuevo usuario. SOLO el admin puede hacerlo.

    Espera un JSON asi:
    {
        "nombre": "Pedro Lopez",
        "email": "pedro@gmail.com",
        "password": "123456",
        "rol": "cajero"
    }

    Si no se envia password, se genera una temporal.
    El empleado podra entrar con Google usando ese email.
    """
    usuario_id = get_jwt_identity()
    admin = Usuario.query.get(usuario_id)

    if not admin or admin.rol != 'admin':
        return jsonify({'error': 'Solo el administrador puede crear usuarios'}), 403

    data = request.get_json()

    if not data:
        return jsonify({'error': 'No se enviaron datos'}), 400

    nombre = data.get('nombre')
    email = data.get('email')
    password = data.get('password', 'google-oauth-user')
    rol = data.get('rol', 'cajero')

    if not nombre or not email:
        return jsonify({'error': 'Faltan campos: nombre y email son obligatorios'}), 400

    roles_validos = ['admin', 'supervisor', 'cajero']
    if rol not in roles_validos:
        return jsonify({'error': f'Rol invalido. Usa: {roles_validos}'}), 400

    if Usuario.query.filter_by(email=email).first():
        return jsonify({'error': 'Ya existe un usuario con ese email'}), 409

    password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    nuevo_usuario = Usuario(
        nombre=nombre,
        email=email,
        password=password_hash,
        rol=rol
    )

    db.session.add(nuevo_usuario)
    db.session.commit()

    return jsonify({
        'mensaje': 'Usuario registrado exitosamente',
        'usuario': nuevo_usuario.to_dict()
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Iniciar sesion con email y contrasena.

    Espera:
    {
        "email": "juan@email.com",
        "password": "123456"
    }
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No se enviaron datos'}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Faltan campos: email, password'}), 400

    usuario = Usuario.query.filter_by(email=email).first()

    if not usuario:
        return jsonify({'error': 'Email o contrasena incorrectos'}), 401

    if not usuario.activo:
        return jsonify({'error': 'Tu cuenta esta desactivada'}), 403

    if not bcrypt.check_password_hash(usuario.password, password):
        return jsonify({'error': 'Email o contrasena incorrectos'}), 401

    access_token = create_access_token(identity=str(usuario.id))
    refresh_token = create_refresh_token(identity=str(usuario.id))

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'usuario': usuario.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    """Obtener los datos del usuario actual (requiere token)."""
    usuario_id = get_jwt_identity()
    usuario = Usuario.query.get(usuario_id)

    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    return jsonify({'usuario': usuario.to_dict()}), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Renovar el access_token usando el refresh_token."""
    usuario_id = get_jwt_identity()
    new_token = create_access_token(identity=usuario_id)

    return jsonify({'access_token': new_token}), 200


# ==========================================
# GOOGLE OAUTH
# ==========================================

@auth_bp.route('/google/login', methods=['GET'])
def google_login():
    """Redirigir al usuario a la pantalla de login de Google."""
    try:
        google_config = http_requests.get(GOOGLE_DISCOVERY_URL, timeout=10).json()
        authorization_endpoint = google_config['authorization_endpoint']

        redirect_uri = url_for('auth.google_callback', _external=True)

        params = {
            'client_id': GOOGLE_CLIENT_ID,
            'redirect_uri': redirect_uri,
            'scope': 'openid email profile',
            'response_type': 'code',
            'access_type': 'offline',
            'prompt': 'select_account'
        }

        from urllib.parse import urlencode
        query = urlencode(params)
        auth_url = f'{authorization_endpoint}?{query}'

        return jsonify({'auth_url': auth_url}), 200

    except Exception:
        return jsonify({'error': 'No se pudo conectar con Google'}), 502


@auth_bp.route('/google/callback', methods=['GET'])
def google_callback():
    """Google redirige aqui despues del login.

    Flujo:
    1. Google nos da un 'code'
    2. Cambiamos ese code por un token de Google
    3. Con el token pedimos los datos del usuario (email, nombre)
    4. Si el email esta registrado en nuestra BD, hacemos login
    5. Si no esta registrado, lo rechazamos
    6. Regresamos nuestro JWT
    """
    code = request.args.get('code')

    if not code:
        return jsonify({'error': 'No se recibio el codigo de Google'}), 400

    try:
        # Obtener endpoints de Google
        google_config = http_requests.get(GOOGLE_DISCOVERY_URL, timeout=10).json()
        token_endpoint = google_config['token_endpoint']
        userinfo_endpoint = google_config['userinfo_endpoint']

        # Cambiar el code por un token
        token_data = {
            'code': code,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'redirect_uri': url_for('auth.google_callback', _external=True),
            'grant_type': 'authorization_code'
        }

        token_response = http_requests.post(token_endpoint, data=token_data, timeout=10)

        if token_response.status_code != 200:
            return jsonify({'error': 'Error al obtener token de Google'}), 400

        tokens = token_response.json()
        access_token = tokens.get('access_token')

        # Obtener datos del usuario de Google
        headers = {'Authorization': f'Bearer {access_token}'}
        userinfo = http_requests.get(userinfo_endpoint, headers=headers, timeout=10).json()

        email = userinfo.get('email')

        if not email:
            return jsonify({'error': 'No se pudo obtener el email de Google'}), 400

        # Buscar el usuario en nuestra BD
        usuario = Usuario.query.filter_by(email=email).first()

        if not usuario:
            return jsonify({
                'error': 'No tienes acceso al sistema',
                'mensaje': 'Tu email no esta registrado. Pide al administrador que te de de alta.'
            }), 403

        if not usuario.activo:
            return jsonify({'error': 'Tu cuenta esta desactivada'}), 403

        # Generar nuestro JWT
        jwt_access = create_access_token(identity=str(usuario.id))
        jwt_refresh = create_refresh_token(identity=str(usuario.id))

        import json
        usuario_json = json.dumps(usuario.to_dict())
        html = f'''
        <html><body><script>
            localStorage.setItem('access_token', '{jwt_access}');
            localStorage.setItem('refresh_token', '{jwt_refresh}');
            localStorage.setItem('usuario', '{usuario_json}');
            window.location.href = '/dashboard';
        </script></body></html>
        '''
        return html

    except Exception:
        return jsonify({'error': 'Error al procesar login con Google'}), 500