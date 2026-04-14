# VisualShop - Sistema de Punto de Venta

Sistema de Punto de Venta (POS) web para pequenos negocios. Permite registrar ventas, controlar inventario, gestionar empleados, generar facturas electronicas y tomar decisiones con datos en tiempo real.

## Tecnologias

- **Backend:** Python 3.12 + Flask
- **Base de datos:** PostgreSQL (psycopg v3)
- **Frontend:** HTML5, CSS3, JavaScript, Bootstrap 5
- **Graficas:** Chart.js
- **Autenticacion:** JWT + Google OAuth 2.0
- **Despliegue:** Railway

## APIs integradas

| # | API | Uso |
|---|-----|-----|
| 1 | API propia (Flask REST) | Backend con endpoints para productos, ventas, usuarios, reportes |
| 2 | ExchangeRate-API | Tipo de cambio MXN/USD en tiempo real |
| 3 | Open Food Facts | Busqueda de productos por codigo de barras |
| 4 | OpenWeatherMap | Widget de clima local en el dashboard |
| 5 | jsPDF | Generacion de tickets de venta en PDF |
| 6 | Facturapi.io | Facturacion electronica CFDI (modo sandbox) |
| 7 | SendGrid | Envio de tickets por correo electronico |
| 8 | Google OAuth 2.0 | Inicio de sesion con Google |

## Funcionalidades

- Registro de ventas con carrito de productos
- Control de inventario con alertas de stock bajo
- Dashboard con metricas, grafica de ventas semanal y top productos
- Gestion de productos con busqueda por codigo de barras
- Facturacion electronica CFDI
- Tickets PDF descargables
- Compartir tickets por WhatsApp y correo electronico
- Tipo de cambio MXN/USD en tiempo real
- Widget de clima local
- Historial de ventas con filtros por fecha
- Gestion de categorias de productos

## Roles y permisos

| Funcion | Admin | Supervisor | Cajero |
|---------|-------|------------|--------|
| Dashboard y reportes | Si | Si | No |
| Registrar ventas | Si | Si | Si |
| Crear/editar productos | Si | Si | No |
| Ver inventario | Si | Si | Solo lectura |
| Gestionar usuarios | Si | No | No |
| Generar facturas | Si | Si | No |
| Ajustar stock | Si | Si | No |

## Estructura del proyecto

```
VisualShop/
├── run.py                    # Punto de entrada
├── requirements.txt          # Dependencias
├── Procfile                  # Configuracion Railway
├── runtime.txt               # Version de Python
├── .env                      # Variables de entorno (no se sube)
├── config/
│   └── config.py             # Configuracion de la app
├── app/
│   ├── __init__.py           # Factory pattern de Flask
│   ├── models/
│   │   ├── usuario.py        # Modelo de usuarios
│   │   ├── producto.py       # Modelos de productos y categorias
│   │   └── venta.py          # Modelos de ventas y detalles
│   ├── routes/
│   │   ├── auth.py           # Autenticacion, JWT, Google OAuth
│   │   ├── productos.py      # CRUD de productos
│   │   ├── categorias.py     # CRUD de categorias
│   │   ├── ventas.py         # Registro y consulta de ventas
│   │   ├── barcode.py        # Busqueda por codigo de barras
│   │   ├── exchange.py       # Tipo de cambio
│   │   ├── weather.py        # Clima
│   │   ├── email.py          # Envio de correos con SendGrid
│   │   ├── facturacion.py    # Facturacion CFDI con Facturapi
│   │   ├── views.py          # Rutas de las paginas HTML
│   │   └── test.py           # Rutas de prueba
│   ├── utils/
│   │   └── decorators.py     # Decorador RBAC para proteger rutas
│   ├── templates/
│   │   ├── landing.html      # Pagina de login
│   │   ├── base.html         # Template base con sidebar
│   │   ├── dashboard/
│   │   │   └── index.html    # Dashboard principal
│   │   ├── ventas/
│   │   │   ├── pos.html      # Punto de venta
│   │   │   └── index.html    # Historial de ventas
│   │   ├── productos/
│   │   │   └── index.html    # Gestion de productos
│   │   └── usuarios/
│   │       └── index.html    # Gestion de usuarios
│   └── static/
│       ├── css/
│       │   ├── landing.css   # Estilos del login
│       │   └── app.css       # Estilos generales de la app
│       └── js/
│           ├── landing.js    # Logica del login
│           ├── app.js        # Autenticacion y funciones globales
│           ├── dashboard.js  # Logica del dashboard
│           ├── pos.js        # Logica del punto de venta
│           ├── productos.js  # Logica de productos
│           ├── ventas.js     # Logica del historial de ventas
│           └── usuarios.js   # Logica de gestion de usuarios
```

## Instalacion local

### Requisitos previos
- Python 3.12+
- PostgreSQL

### Pasos

1. Clonar el repositorio:
```bash
git clone https://github.com/TU_USUARIO/VisualShop.git
cd VisualShop
```

2. Crear entorno virtual e instalar dependencias:
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

3. Crear la base de datos en PostgreSQL:
```sql
CREATE DATABASE visualshop;
CREATE USER "visualshopMaster" WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE visualshop TO "visualshopMaster";
ALTER DATABASE visualshop OWNER TO "visualshopMaster";
GRANT ALL ON SCHEMA public TO "visualshopMaster";
```

4. Crear el archivo `.env` con las variables de entorno:
```
DATABASE_URL=postgresql+psycopg://visualshopMaster:tu_password@localhost:5432/visualshop
SECRET_KEY=tu_clave_secreta
JWT_SECRET_KEY=tu_clave_jwt
OPENWEATHER_API_KEY=tu_key
FACTURAPI_API_KEY=tu_key
SENDGRID_API_KEY=tu_key
SENDGRID_FROM_EMAIL=tu_email
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
```

5. Ejecutar la aplicacion:
```bash
python run.py
```

6. Crear el primer administrador:
```
POST http://localhost:5000/api/auth/setup
{
    "nombre": "Tu Nombre",
    "email": "tu@email.com",
    "password": "tu_password"
}
```

7. Abrir en el navegador: `http://localhost:5000`

## Despliegue

La aplicacion esta desplegada en Railway:

**URL:** https://web-production-342ab.up.railway.app

## Equipo

| Integrante | Rol |
|------------|-----|
| Marlon Rojas Galindo | Desarrollador backend (ventas e inventario) |
| Gael Roman Gomez Carrillo | Desarrollador backend (seguridad y usuarios) |
| Arturo Israel Martinez Cordova | Desarrollador frontend (dashboard y reportes) |

**Materia:** Aplicaciones Web Orientadas a Servicios
**Profesor:** Anastacio Rodriguez Garcia
**Institucion:** Universidad Tecnologica del Norte de Guanajuato
**Periodo:** 2026
