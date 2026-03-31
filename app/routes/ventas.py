from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.producto import Producto
from app.models.venta import Venta, DetalleVenta
from app.utils.decorators import rol_requerido

ventas_bp = Blueprint('ventas', __name__, url_prefix='/api/ventas')


@ventas_bp.route('', methods=['POST'])
@jwt_required()
def registrar_venta():
    """Registrar una venta completa (un ticket).

    Espera un JSON asi:
    {
        "metodo_pago": "efectivo",
        "productos": [
            {"producto_id": 1, "cantidad": 2},
            {"producto_id": 3, "cantidad": 1}
        ]
    }

    El sistema automaticamente:
    - Calcula el subtotal de cada producto
    - Calcula el total de la venta
    - Descuenta el stock de cada producto
    - Registra quien hizo la venta (el cajero logueado)
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No se enviaron datos'}), 400

    productos_venta = data.get('productos', [])

    if not productos_venta:
        return jsonify({'error': 'La venta debe tener al menos un producto'}), 400

    # Obtener el id del cajero que esta logueado
    usuario_id = get_jwt_identity()

    # Validar todos los productos antes de procesar
    detalles = []
    total = 0
    errores = []

    for item in productos_venta:
        producto_id = item.get('producto_id')
        cantidad = item.get('cantidad', 0)

        if not producto_id or cantidad <= 0:
            errores.append(f'Producto {producto_id}: cantidad invalida')
            continue

        producto = Producto.query.get(producto_id)

        if not producto or not producto.activo:
            errores.append(f'Producto {producto_id}: no encontrado')
            continue

        if producto.stock < cantidad:
            errores.append(
                f'{producto.nombre}: stock insuficiente '
                f'(disponible: {producto.stock}, pedido: {cantidad})'
            )
            continue

        subtotal = producto.precio * cantidad
        total += subtotal

        detalles.append({
            'producto': producto,
            'cantidad': cantidad,
            'precio_unitario': producto.precio,
            'subtotal': subtotal
        })

    # Si hubo errores en algun producto, no procesar la venta
    if errores:
        return jsonify({
            'error': 'No se pudo procesar la venta',
            'detalles': errores
        }), 400

    # Todo valido: crear la venta
    venta = Venta(
        total=round(total, 2),
        metodo_pago=data.get('metodo_pago', 'efectivo'),
        usuario_id=usuario_id
    )
    db.session.add(venta)
    db.session.flush()  # Para obtener el ID de la venta sin hacer commit aun

    # Crear los detalles y descontar stock
    alertas_stock = []

    for detalle in detalles:
        producto = detalle['producto']

        # Crear el detalle de venta
        detalle_venta = DetalleVenta(
            venta_id=venta.id,
            producto_id=producto.id,
            cantidad=detalle['cantidad'],
            precio_unitario=detalle['precio_unitario'],
            subtotal=detalle['subtotal']
        )
        db.session.add(detalle_venta)

        # Descontar stock
        producto.stock -= detalle['cantidad']

        # Verificar si el stock quedo bajo
        if producto.stock_bajo:
            alertas_stock.append(
                f'{producto.nombre}: quedan {producto.stock} unidades '
                f'(minimo: {producto.stock_minimo})'
            )

    # Guardar todo en la BD
    db.session.commit()

    respuesta = {
        'mensaje': 'Venta registrada exitosamente',
        'venta': venta.to_dict()
    }

    if alertas_stock:
        respuesta['alertas_stock'] = alertas_stock

    return jsonify(respuesta), 201


@ventas_bp.route('', methods=['GET'])
@rol_requerido('admin', 'supervisor')
def listar_ventas():
    """Listar todas las ventas. Solo admin y supervisor.

    Soporta filtros:
        /api/ventas?fecha=2026-03-31       -> ventas de un dia
        /api/ventas?limite=10              -> ultimas 10 ventas
    """
    query = Venta.query.order_by(Venta.fecha.desc())

    # Filtro por fecha
    fecha = request.args.get('fecha')
    if fecha:
        from datetime import datetime
        try:
            fecha_obj = datetime.strptime(fecha, '%Y-%m-%d')
            siguiente_dia = fecha_obj.replace(hour=23, minute=59, second=59)
            query = query.filter(
                Venta.fecha >= fecha_obj,
                Venta.fecha <= siguiente_dia
            )
        except ValueError:
            return jsonify({'error': 'Formato de fecha invalido. Usa: YYYY-MM-DD'}), 400

    # Limite de resultados
    limite = request.args.get('limite', type=int)
    if limite:
        query = query.limit(limite)

    ventas = query.all()

    return jsonify({
        'total': len(ventas),
        'ventas': [v.to_dict() for v in ventas]
    }), 200


@ventas_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def obtener_venta(id):
    """Ver el detalle de una venta especifica (el ticket)."""
    venta = Venta.query.get(id)

    if not venta:
        return jsonify({'error': 'Venta no encontrada'}), 404

    return jsonify(venta.to_dict()), 200


@ventas_bp.route('/resumen', methods=['GET'])
@rol_requerido('admin', 'supervisor')
def resumen_ventas():
    """Resumen rapido: ventas de hoy, total del dia, productos vendidos."""
    from datetime import datetime, timedelta

    hoy = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    manana = hoy + timedelta(days=1)

    ventas_hoy = Venta.query.filter(
        Venta.fecha >= hoy,
        Venta.fecha < manana
    ).all()

    total_hoy = sum(v.total for v in ventas_hoy)
    num_ventas = len(ventas_hoy)

    # Productos mas vendidos hoy
    from sqlalchemy import func
    top_productos = db.session.query(
        Producto.nombre,
        func.sum(DetalleVenta.cantidad).label('total_vendido')
    ).join(
        DetalleVenta, Producto.id == DetalleVenta.producto_id
    ).join(
        Venta, DetalleVenta.venta_id == Venta.id
    ).filter(
        Venta.fecha >= hoy,
        Venta.fecha < manana
    ).group_by(
        Producto.nombre
    ).order_by(
        func.sum(DetalleVenta.cantidad).desc()
    ).limit(5).all()

    return jsonify({
        'fecha': hoy.strftime('%Y-%m-%d'),
        'num_ventas': num_ventas,
        'total_dia': round(total_hoy, 2),
        'top_productos': [
            {'nombre': nombre, 'vendidos': int(total)}
            for nombre, total in top_productos
        ]
    }), 200