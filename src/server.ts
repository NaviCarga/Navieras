import { crearApp } from './app';
import { crearConexion } from './db/conexion';

const db = crearConexion();
const app = crearApp(db);
const puerto = Number(process.env.PORT ?? 3000);

app.listen(puerto, () => {
  console.log(`Servidor en http://localhost:${puerto}`);
});
