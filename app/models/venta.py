from app import db
from datetime import datetime


class Venta(db.Model):
    """Tabla 'ventas': cada fila es una venta completa (el "ticket").
    Contiene el total, quien vendio y cuando."""

    __tablename__ = 'ventas'

    id = db.Column(db.Integer, primary_key=True)

    # Total de la venta (suma de todos los productos)
    total = db.Column(db.Float, nullable=False)

    # Metodo de pago: 'efectivo', 'tarjeta', etc.
    metodo_pago = db.Column(db.String(30), default='efectivo')

    # FK: que cajero hizo la venta
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)

    fecha = db.Column(db.DateTime, default=datetime.utcnow)

    # Relacion: una venta tiene muchos productos (detalles)
    detalles = db.relationship('DetalleVenta', backref='venta', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'total': self.total,
            'metodo_pago': self.metodo_pago,
            'cajero': self.cajero.nombre if self.cajero else None,
            'fecha': self.fecha.isoformat(),
            'detalles': [d.to_dict() for d in self.detalles]
        }


class DetalleVenta(db.Model):
    """Tabla 'detalle_ventas': cada fila es UN producto dentro de una venta.

    Ejemplo: si vendes 2 Cocas y 1 pan, hay 2 filas en detalle_ventas:
    - Fila 1: Coca-Cola, cantidad=2, subtotal=40.00
    - Fila 2: Pan Bimbo,  cantidad=1, subtotal=25.00

    Es la tabla intermedia entre Ventas y Productos (relacion N:M)."""

    __tablename__ = 'detalle_ventas'

    id = db.Column(db.Integer, primary_key=True)

    # FK: a que venta pertenece este detalle
    venta_id = db.Column(db.Integer, db.ForeignKey('ventas.id'), nullable=False)

    # FK: que producto se vendio
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False)

    # Cuantas unidades se vendieron
    cantidad = db.Column(db.Integer, nullable=False)

    # Precio unitario AL MOMENTO de la venta
    # (importante guardarlo porque el precio puede cambiar despues)
    precio_unitario = db.Column(db.Float, nullable=False)

    # cantidad * precio_unitario
    subtotal = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'producto': self.producto.nombre if self.producto else None,
            'cantidad': self.cantidad,
            'precio_unitario': self.precio_unitario,
            'subtotal': self.subtotal
        }