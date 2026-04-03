import os
import requests
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.venta import Venta
from app.utils.decorators import rol_requerido

facturacion_bp = Blueprint('facturacion', __name__, url_prefix='/api/facturas')

FACTURAPI_KEY = os.getenv('FACTURAPI_API_KEY')
FACTURAPI_URL = 'https://www.facturapi.io/v2'


@facturacion_bp.route('/crear', methods=['POST'])
@rol_requerido('admin', 'supervisor')
def crear_factura():
    """Crear una factura CFDI a partir de una venta.

    Espera:
    {
        "venta_id": 1,
        "cliente": {
            "legal_name": "Juan Perez",
            "tax_id": "XAXX010101000",
            "email": "cliente@email.com"
        }
    }

    Si no se envia cliente, se usa el RFC generico del publico en general.
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No se enviaron datos'}), 400

    venta_id = data.get('venta_id')
    if not venta_id:
        return jsonify({'error': 'Falta el campo venta_id'}), 400

    venta = Venta.query.get(venta_id)
    if not venta:
        return jsonify({'error': 'Venta no encontrada'}), 404

    if not FACTURAPI_KEY:
        return jsonify({'error': 'Facturapi no esta configurado'}), 500

    headers = {
        'Authorization': 'Bearer ' + FACTURAPI_KEY,
        'Content-Type': 'application/json'
    }

    # Datos del cliente (publico en general si no se especifica)
    cliente_data = data.get('cliente', {})
    customer = {
        'legal_name': cliente_data.get('legal_name', 'Publico en General'),
        'tax_id': cliente_data.get('tax_id', 'XAXX010101000'),
        'tax_system': cliente_data.get('tax_system', '616'),
        'email': cliente_data.get('email', ''),
        'address': {
            'zip': '37800'
        }
    }

    # Construir los items de la factura desde los detalles de la venta
    items = []
    for detalle in venta.detalles:
        items.append({
            'quantity': detalle.cantidad,
            'product': {
                'description': detalle.producto.nombre,
                'product_key': '01010101',
                'price': detalle.precio_unitario,
                'tax_included': True
            }
        })

    factura_data = {
        'customer': customer,
        'items': items,
        'payment_form': '01' if venta.metodo_pago == 'efectivo' else '04',
        'use': 'S01'
    }

    try:
        response = requests.post(
            FACTURAPI_URL + '/invoices',
            json=factura_data,
            headers=headers,
            timeout=15
        )

        if response.status_code in [200, 201]:
            factura = response.json()
            return jsonify({
                'mensaje': 'Factura creada exitosamente',
                'factura': {
                    'id': factura.get('id'),
                    'status': factura.get('status'),
                    'total': factura.get('total'),
                    'uuid': factura.get('uuid', ''),
                    'pdf_url': FACTURAPI_URL + '/invoices/' + factura.get('id') + '/pdf',
                    'xml_url': FACTURAPI_URL + '/invoices/' + factura.get('id') + '/xml'
                }
            }), 201
        else:
            error_data = response.json()
            return jsonify({
                'error': 'Error al crear factura',
                'detalle': error_data.get('message', str(error_data))
            }), 400

    except requests.exceptions.Timeout:
        return jsonify({'error': 'Facturapi tardo demasiado'}), 504
    except Exception as e:
        return jsonify({'error': 'Error al crear factura: ' + str(e)}), 500


@facturacion_bp.route('/descargar/<string:factura_id>/<string:formato>', methods=['GET'])
def descargar_factura(factura_id, formato):
    """Descargar PDF o XML de una factura.

    Ejemplo:
        GET /api/facturas/descargar/abc123/pdf
        GET /api/facturas/descargar/abc123/xml
    """
    if formato not in ['pdf', 'xml']:
        return jsonify({'error': 'Formato invalido. Usa: pdf o xml'}), 400

    if not FACTURAPI_KEY:
        return jsonify({'error': 'Facturapi no esta configurado'}), 500

    headers = {
        'Authorization': 'Bearer ' + FACTURAPI_KEY
    }

    try:
        response = requests.get(
            FACTURAPI_URL + '/invoices/' + factura_id + '/' + formato,
            headers=headers,
            timeout=15
        )

        if response.status_code == 200:
            from flask import Response
            content_type = 'application/pdf' if formato == 'pdf' else 'application/xml'
            return Response(
                response.content,
                content_type=content_type,
                headers={
                    'Content-Disposition': f'attachment; filename=factura_{factura_id}.{formato}'
                }
            )
        else:
            return jsonify({'error': 'No se pudo descargar la factura'}), 502

    except Exception:
        return jsonify({'error': 'Error al descargar factura'}), 500