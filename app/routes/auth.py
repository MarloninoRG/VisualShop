from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity
)
from app import db, bcrypt
from app.models.usuario import Usuario

# Blueprint: agrupa rutas relacionadas bajo un prefijo
# Todas las rutas aqui seran /api/auth/...
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    """Registrar un nuevo usuario.

    Espera un JSON asi:
    {
        "nombre": "Juan Perez",
        "email": "juan@email.com",
        "password": "123456",
        "rol": "cajero"        (opcional, por defecto es "cajero")
    }
    """
    data = request.get_json()

    # Validar que vengan los campos necesarios
    if not data:
        return jsonify({'error': 'No se enviaron datos'}), 400

    nombre = data.get('nombre')
    email = data.get('email')
    password = data.get('password')
    rol = data.get('rol', 'cajero')

    if not nombre or not email or not password:
        return jsonify({'error': 'Faltan campos: nombre, email, password'}), 400

    # Validar que el rol sea valido
    roles_validos = ['admin', 'supervisor', 'cajero']
    if rol not in roles_validos:
        return jsonify({'error': f'Rol invalido. Usa: {roles_validos}'}), 400

    # Verificar que el email no exista ya
    if Usuario.query.filter_by(email=email).first():
        return jsonify({'error': 'Ya existe un usuario con ese email'}), 409

    # Encriptar la contrasena con bcrypt
    # Nunca guardamos la contrasena en texto plano
    password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    # Crear el usuario
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
    """Iniciar sesion y obtener un token JWT.

    Espera un JSON asi:
    {
        "email": "juan@email.com",
        "password": "123456"
    }

    Retorna:
    {
        "access_token": "eyJhbGci...",
        "refresh_token": "eyJhbGci...",
        "usuario": { ... }
    }
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No se enviaron datos'}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Faltan campos: email, password'}), 400

    # Buscar al usuario por email
    usuario = Usuario.query.filter_by(email=email).first()

    if not usuario:
        return jsonify({'error': 'Email o contrasena incorrectos'}), 401

    if not usuario.activo:
        return jsonify({'error': 'Tu cuenta esta desactivada'}), 403

    # Verificar la contrasena
    # bcrypt.check compara la contrasena en texto plano con el hash guardado
    if not bcrypt.check_password_hash(usuario.password, password):
        return jsonify({'error': 'Email o contrasena incorrectos'}), 401

    # Crear los tokens JWT
    # identity: el dato que se guarda DENTRO del token (usamos el id del usuario)
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
    """Obtener los datos del usuario actual (requiere token).

    El decorador @jwt_required() verifica automaticamente el token.
    Si no hay token o es invalido, regresa 401.
    """
    usuario_id = get_jwt_identity()
    usuario = Usuario.query.get(usuario_id)

    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    return jsonify({'usuario': usuario.to_dict()}), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Renovar el access_token usando el refresh_token.

    Cuando el access_token expira (1 hora), el frontend usa
    el refresh_token para pedir uno nuevo sin volver a hacer login.
    """
    usuario_id = get_jwt_identity()
    new_token = create_access_token(identity=usuario_id)

    return jsonify({'access_token': new_token}), 200