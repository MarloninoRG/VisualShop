"""
run.py - Punto de entrada de VisualShop
Para correr la app: python run.py
Luego abre: http://localhost:5000
"""

from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)