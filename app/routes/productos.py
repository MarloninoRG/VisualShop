from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.producto import Producto, Categoria
from app.utils.decorators import rol_requerido

productos_bp = Blueprint('productos', __name__, url_prefix='/api/productos')


@productos_bp.route('', methods=['GET'])
@jwt_required()
def listar_productos():
    """Listar todos los productos. Cualquier rol puede ver.

    Soporta filtros por query params:
        /api/productos?categoria=1        -> filtrar por categoria
        /api/productos?buscar=coca        -> buscar por nombre
        /api/productos?stock_bajo=true    -> solo productos con stock bajo
    """
    query = Producto.query.filter_by(activo=True)

    # Filtro por categoria
    categoria_id = request.args.get('categoria')
    if categoria_id:
        query = query.filter_by(categoria_id=categoria_id)

    # Busqueda por nombre
    buscar = request.args.get('buscar')
    if buscar:
        query = query.filter(Producto.nombre.ilike(f'%{buscar}%'))

    # Filtro de stock bajo
    stock_bajo = request.args.get('stock_bajo')
    if stock_bajo == 'true':
        query = query.filter(Producto.stock <= Producto.stock_minimo)

    productos = query.all()
    return jsonify([p.to_dict() for p in productos]), 200


@productos_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def obtener_producto(id):
    """Obtener un producto por su ID."""
    producto = Producto.query.get(id)

    if not producto or not producto.activo:
        return jsonify({'error': 'Producto no encontrado'}), 404

    return jsonify(producto.to_dict()), 200


@productos_bp.route('', methods=['POST'])
@rol_requerido('admin', 'supervisor')
def crear_producto():
    """Crear un producto nuevo. Solo admin y supervisor.

    Espera un JSON asi:
    {
        "nombre": "Coca-Cola 600ml",
        "descripcion": "Refresco de cola",
        "codigo_barras": "7501055303526",
        "precio": 18.50,
        "stock": 24,
        "stock_minimo": 5,
        "categoria_id": 1
    }
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No se enviaron datos'}), 400

    # Campos obligatorios
    nombre = data.get('nombre')
    precio = data.get('precio')

    if not nombre or precio is None:
        return jsonify({'error': 'Faltan campos: nombre y precio son obligatorios'}), 400

    if precio < 0:
        return jsonify({'error': 'El precio no puede ser negativo'}), 400

    # Verificar codigo de barras unico (si se envio)
    codigo_barras = data.get('codigo_barras')
    if codigo_barras:
        if Producto.query.filter_by(codigo_barras=codigo_barras).first():
            return jsonify({'error': 'Ya existe un producto con ese codigo de barras'}), 409

    # Verificar que la categoria existe (si se envio)
    categoria_id = data.get('categoria_id')
    if categoria_id:
        if not Categoria.query.get(categoria_id):
            return jsonify({'error': 'La categoria no existe'}), 404

    producto = Producto(
        nombre=nombre,
        descripcion=data.get('descripcion', ''),
        codigo_barras=codigo_barras,
        precio=precio,
        stock=data.get('stock', 0),
        stock_minimo=data.get('stock_minimo', 5),
        categoria_id=categoria_id
    )

    db.session.add(producto)
    db.session.commit()

    return jsonify({
        'mensaje': 'Producto creado',
        'producto': producto.to_dict()
    }), 201


@productos_bp.route('/<int:id>', methods=['PUT'])
@rol_requerido('admin', 'supervisor')
def actualizar_producto(id):
    """Actualizar un producto. Solo admin y supervisor.

    Puedes enviar solo los campos que quieras cambiar:
    {
        "precio": 20.00,
        "stock": 30
    }
    """
    producto = Producto.query.get(id)

    if not producto or not producto.activo:
        return jsonify({'error': 'Producto no encontrado'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No se enviaron datos'}), 400

    # Actualizar solo los campos que se enviaron
    if 'nombre' in data:
        producto.nombre = data['nombre']
    if 'descripcion' in data:
        producto.descripcion = data['descripcion']
    if 'precio' in data:
        if data['precio'] < 0:
            return jsonify({'error': 'El precio no puede ser negativo'}), 400
        producto.precio = data['precio']
    if 'stock' in data:
        producto.stock = data['stock']
    if 'stock_minimo' in data:
        producto.stock_minimo = data['stock_minimo']
    if 'categoria_id' in data:
        if data['categoria_id'] and not Categoria.query.get(data['categoria_id']):
            return jsonify({'error': 'La categoria no existe'}), 404
        producto.categoria_id = data['categoria_id']
    if 'codigo_barras' in data:
        if data['codigo_barras']:
            existente = Producto.query.filter_by(codigo_barras=data['codigo_barras']).first()
            if existente and existente.id != id:
                return jsonify({'error': 'Otro producto ya tiene ese codigo de barras'}), 409
        producto.codigo_barras = data['codigo_barras']

    db.session.commit()

    return jsonify({
        'mensaje': 'Producto actualizado',
        'producto': producto.to_dict()
    }), 200


@productos_bp.route('/<int:id>', methods=['DELETE'])
@rol_requerido('admin')
def eliminar_producto(id):
    """Eliminar un producto (soft delete). Solo admin.

    No lo borra de la BD, solo lo marca como inactivo.
    Asi no se pierden los registros de ventas anteriores.
    """
    producto = Producto.query.get(id)

    if not producto:
        return jsonify({'error': 'Producto no encontrado'}), 404

    producto.activo = False
    db.session.commit()

    return jsonify({'mensaje': 'Producto eliminado'}), 200


@productos_bp.route('/stock-bajo', methods=['GET'])
@rol_requerido('admin', 'supervisor')
def productos_stock_bajo():
    """Listar productos con stock bajo. Admin y supervisor."""
    productos = Producto.query.filter(
        Producto.activo == True,
        Producto.stock <= Producto.stock_minimo
    ).all()

    return jsonify({
        'total': len(productos),
        'productos': [p.to_dict() for p in productos]
    }), 200


@productos_bp.route('/<int:id>/ajustar-stock', methods=['PUT'])
@rol_requerido('admin', 'supervisor')
def ajustar_stock(id):
    """Ajustar el stock de un producto manualmente.

    Espera:
    {
        "cantidad": 10,
        "operacion": "agregar"    -> agregar o quitar
    }
    """
    producto = Producto.query.get(id)

    if not producto or not producto.activo:
        return jsonify({'error': 'Producto no encontrado'}), 404

    data = request.get_json()
    cantidad = data.get('cantidad', 0)
    operacion = data.get('operacion', 'agregar')

    if cantidad <= 0:
        return jsonify({'error': 'La cantidad debe ser mayor a 0'}), 400

    if operacion == 'agregar':
        producto.stock += cantidad
    elif operacion == 'quitar':
        if producto.stock < cantidad:
            return jsonify({'error': 'No hay suficiente stock para quitar'}), 400
        producto.stock -= cantidad
    else:
        return jsonify({'error': 'Operacion invalida. Usa: agregar o quitar'}), 400

    db.session.commit()

    alerta = None
    if producto.stock_bajo:
        alerta = f'ALERTA: Stock bajo! Quedan {producto.stock} unidades (minimo: {producto.stock_minimo})'

    return jsonify({
        'mensaje': f'Stock actualizado: {producto.stock} unidades',
        'producto': producto.to_dict(),
        'alerta': alerta
    }), 200