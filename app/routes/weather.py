import requests
import os
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

weather_bp = Blueprint('weather', __name__, url_prefix='/api/weather')

OPENWEATHER_KEY = os.getenv('OPENWEATHER_API_KEY')

cache_weather = {
    'data': None,
    'last_update': None
}


@weather_bp.route('/<string:ciudad>', methods=['GET'])
@jwt_required()
def obtener_clima(ciudad):
    """Obtener el clima actual de una ciudad.

    Ejemplo: GET /api/weather/dolores hidalgo
    Los resultados se cachean por 30 minutos.
    """
    from datetime import datetime, timedelta

    if cache_weather['data'] and cache_weather['last_update']:
        if datetime.utcnow() - cache_weather['last_update'] < timedelta(minutes=30):
            return jsonify(cache_weather['data']), 200

    if not OPENWEATHER_KEY:
        return jsonify({'error': 'API key de OpenWeather no configurada'}), 500

    try:
        url = 'https://api.openweathermap.org/data/2.5/weather'
        params = {
            'q': ciudad,
            'appid': OPENWEATHER_KEY,
            'units': 'metric',
            'lang': 'es'
        }
        headers = {'User-Agent': 'VisualShop/1.0'}

        response = requests.get(url, params=params, headers=headers, timeout=10)

        if response.status_code != 200:
            return jsonify({'error': 'No se pudo obtener el clima'}), 502

        data = response.json()

        resultado = {
            'ciudad': data.get('name', ciudad),
            'temperatura': round(data['main']['temp']),
            'sensacion': round(data['main']['feels_like']),
            'humedad': data['main']['humidity'],
            'descripcion': data['weather'][0]['description'],
            'icono': data['weather'][0]['icon'],
            'icono_url': 'https://openweathermap.org/img/wn/' + data['weather'][0]['icon'] + '@2x.png'
        }

        cache_weather['data'] = resultado
        cache_weather['last_update'] = datetime.utcnow()

        return jsonify(resultado), 200

    except requests.exceptions.Timeout:
        return jsonify({'error': 'La consulta tardo demasiado'}), 504

    except Exception:
        return jsonify({'error': 'Error al consultar el clima'}), 500