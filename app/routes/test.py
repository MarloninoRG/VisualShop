from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.utils.decorators import rol_requerido

test_bp = Blueprint('test', __name__, url_prefix='/api/test')


@test_bp.route('/publica', methods=['GET'])
def ruta_publica():
    """Cualquiera puede acceder, no necesita token."""
    return jsonify({'mensaje': 'Esta ruta es publica, no necesitas token'})


@test_bp.route('/protegida', methods=['GET'])
@jwt_required()
def ruta_protegida():
    """Necesitas un token JWT valido (cualquier rol)."""
    return jsonify({'mensaje': 'Tienes un token valido!'})


@test_bp.route('/solo-admin', methods=['GET'])
@rol_requerido('admin')
def solo_admin():
    """Solo el admin puede acceder."""
    return jsonify({'mensaje': 'Eres admin, bienvenido!'})


@test_bp.route('/admin-o-supervisor', methods=['GET'])
@rol_requerido('admin', 'supervisor')
def admin_o_supervisor():
    """Admin o supervisor pueden acceder."""
    return jsonify({'mensaje': 'Tienes acceso de admin o supervisor'})