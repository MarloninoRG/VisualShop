from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models.usuario import Usuario


def rol_requerido(*roles_permitidos):
    """Decorador que protege una ruta y solo permite ciertos roles.

    Uso:
        @rol_requerido('admin', 'supervisor')
        def mi_ruta():
            ...

    Como funciona:
    1. Verifica que el usuario mando un token JWT valido
    2. Busca al usuario en la BD usando el id del token
    3. Revisa si su rol esta en la lista de roles permitidos
    4. Si no tiene permiso, regresa error 403
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Paso 1: Verificar que hay un token JWT valido
            verify_jwt_in_request()

            # Paso 2: Obtener el id del usuario desde el token
            usuario_id = get_jwt_identity()

            # Paso 3: Buscar al usuario en la base de datos
            usuario = Usuario.query.get(usuario_id)

            if not usuario:
                return jsonify({'error': 'Usuario no encontrado'}), 404

            if not usuario.activo:
                return jsonify({'error': 'Usuario desactivado'}), 403

            # Paso 4: Verificar el rol
            if usuario.rol not in roles_permitidos:
                return jsonify({
                    'error': 'No tienes permiso para esta accion',
                    'tu_rol': usuario.rol,
                    'roles_permitidos': list(roles_permitidos)
                }), 403

            # Todo bien, ejecutar la funcion original
            return fn(*args, **kwargs)
        return wrapper
    return decorator