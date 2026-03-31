CREATE USER "visualshopMaster" WITH PASSWORD '12345678';
GRANT ALL PRIVILEGES ON DATABASE visualshop TO "visualshopMaster";

GRANT ALL ON SCHEMA public TO "visualshopMaster";
ALTER DATABASE visualshop OWNER TO "visualshopMaster";