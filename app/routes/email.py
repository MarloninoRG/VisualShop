import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.venta import Venta

email_bp = Blueprint('email', __name__, url_prefix='/api/email')

SENDGRID_KEY = os.getenv('SENDGRID_API_KEY')
FROM_EMAIL = os.getenv('SENDGRID_FROM_EMAIL')


@email_bp.route('/ticket', methods=['POST'])
@jwt_required()
def enviar_ticket(  ):
    """Enviar ticket de venta por correo electronico.

    Espera:
    {
        "venta_id": 1,
        "email": "cliente@email.com"
    }
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No se enviaron datos'}), 400

    venta_id = data.get('venta_id')
    email_destino = data.get('email')

    if not venta_id or not email_destino:
        return jsonify({'error': 'Faltan campos: venta_id y email'}), 400

    venta = Venta.query.get(venta_id)
    if not venta:
        return jsonify({'error': 'Venta no encontrada'}), 404

    if not SENDGRID_KEY or not FROM_EMAIL:
        return jsonify({'error': 'SendGrid no esta configurado'}), 500

    # Construir el HTML del ticket
    productos_html = ''
    for d in venta.detalles:
        productos_html += f'''
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee">{d.producto.nombre}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">{d.cantidad}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${d.precio_unitario:.2f}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${d.subtotal:.2f}</td>
        </tr>'''

    fecha = venta.fecha.strftime('%d/%m/%Y %H:%M')
    cajero = venta.cajero.nombre if venta.cajero else 'N/A'

    html_content = f'''
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
        <div style="text-align:center;padding:20px;background:#2E3A5C;border-radius:10px 10px 0 0">
            <h2 style="color:#fff;margin:0">VisualShop</h2>
            <p style="color:#DDD5F3;margin:4px 0 0;font-size:13px">Ticket de compra</p>
        </div>
        <div style="background:#fff;padding:20px;border:1px solid #eee">
            <table style="width:100%;font-size:13px;margin-bottom:12px">
                <tr>
                    <td style="color:#888">Ticket:</td>
                    <td style="text-align:right;font-weight:bold">#{str(venta.id).zfill(3)}</td>
                </tr>
                <tr>
                    <td style="color:#888">Fecha:</td>
                    <td style="text-align:right">{fecha}</td>
                </tr>
                <tr>
                    <td style="color:#888">Cajero:</td>
                    <td style="text-align:right">{cajero}</td>
                </tr>
                <tr>
                    <td style="color:#888">Metodo:</td>
                    <td style="text-align:right">{venta.metodo_pago}</td>
                </tr>
            </table>
            <table style="width:100%;font-size:13px;border-collapse:collapse">
                <thead>
                    <tr style="background:#f8f8ff">
                        <th style="padding:8px;text-align:left">Producto</th>
                        <th style="padding:8px;text-align:center">Cant</th>
                        <th style="padding:8px;text-align:right">Precio</th>
                        <th style="padding:8px;text-align:right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>{productos_html}</tbody>
            </table>
            <div style="text-align:right;padding:16px 0;border-top:2px solid #2E3A5C;margin-top:8px">
                <span style="font-size:18px;font-weight:bold;color:#2E3A5C">Total: ${venta.total:.2f}</span>
            </div>
        </div>
        <div style="text-align:center;padding:16px;background:#f8f8ff;border-radius:0 0 10px 10px">
            <p style="color:#888;font-size:12px;margin:0">Gracias por su compra!</p>
            <p style="color:#aaa;font-size:11px;margin:4px 0 0">VisualShop - UTNG 2026</p>
        </div>
    </div>'''

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=email_destino,
            subject=f'VisualShop - Ticket #{str(venta.id).zfill(3)}',
            html_content=html_content
        )

        sg = SendGridAPIClient(SENDGRID_KEY)
        response = sg.send(message)

        if response.status_code in [200, 201, 202]:
            return jsonify({'mensaje': f'Ticket enviado a {email_destino}'}), 200
        else:
            return jsonify({'error': 'Error al enviar el correo'}), 502

    except Exception as e:
        return jsonify({'error': 'Error al enviar correo: ' + str(e)}), 500