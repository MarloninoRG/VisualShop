from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.producto import Categoria
from app.utils.decorators import rol_requerido

categorias_bp = Blueprint('categorias', __name__, url_prefix='/api/categorias')


@categorias_bp.route('', methods=['GET'])
@jwt_required()
def listar_categorias():
    """Obtener todas las categorias. Cualquier rol puede verlas."""
    categorias = Categoria.query.all()
    return jsonify([c.to_dict() for c in categorias]), 200


@categorias_bp.route('', methods=['POST'])
@rol_requerido('admin', 'supervisor')
def crear_categoria():
    """Crear una categoria nueva. Solo admin y supervisor."""
    data = request.get_json()

    if not data or not data.get('nombre'):
        return jsonify({'error': 'El campo nombre es requerido'}), 400

    nombre = data['nombre'].strip()

    if Categoria.query.filter_by(nombre=nombre).first():
        return jsonify({'error': 'Ya existe una categoria con ese nombre'}), 409

    categoria = Categoria(nombre=nombre)
    db.session.add(categoria)
    db.session.commit()

    return jsonify({
        'mensaje': 'Categoria creada',
        'categoria': categoria.to_dict()
    }), 201


@categorias_bp.route('/<int:id>', methods=['DELETE'])
@rol_requerido('admin')
def eliminar_categoria(id):
    """Eliminar una categoria. Solo admin."""
    categoria = Categoria.query.get(id)

    if not categoria:
        return jsonify({'error': 'Categoria no encontrada'}), 404

    if categoria.productos:
        return jsonify({'error': 'No puedes eliminar una categoria que tiene productos'}), 400

    db.session.delete(categoria)
    db.session.commit()

    return jsonify({'mensaje': 'Categoria eliminada'}), 200