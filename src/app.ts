import express from 'express';
import path from 'node:path';
import type { BaseDatos } from './db/conexion';
import { crearRutaAsignacion } from './rutas/asignacion';
import { crearRutaBooking } from './rutas/booking';
import { crearRutaDisponibilidad } from './rutas/disponibilidad';
import { crearRutaReservas } from './rutas/reservas';

const ROLES = ['exportador', 'naviera', 'agente', 'administrador'] as const;

export type Rol = (typeof ROLES)[number];

const DESTINO_POR_ROL: Record<Rol, string> = {
  exportador: '/disponibilidad',
  naviera: '/reservas',
  agente: '/agente',
  administrador: '/alertas',
};

function leerCookies(cabecera: string | undefined): Record<string, string> {
  if (!cabecera) {
    return {};
  }
  return cabecera.split(';').reduce<Record<string, string>>((cookies, parte) => {
    const [nombre, ...resto] = parte.trim().split('=');
    if (nombre) {
      cookies[nombre] = decodeURIComponent(resto.join('='));
    }
    return cookies;
  }, {});
}

function rolValido(valor: string | undefined): Rol {
  return ROLES.includes(valor as Rol) ? (valor as Rol) : 'exportador';
}

export function crearApp(db: BaseDatos): express.Express {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'src', 'vistas'));
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const cookies = leerCookies(req.headers.cookie);
    res.locals.rol = rolValido(cookies.rol);
    next();
  });

  app.get('/', (_req, res) => {
    res.redirect('/disponibilidad');
  });

  app.get('/rol', (req, res) => {
    const rol = rolValido(typeof req.query.rol === 'string' ? req.query.rol : undefined);
    res.setHeader('Set-Cookie', `rol=${rol}; Path=/; SameSite=Lax`);
    res.redirect(DESTINO_POR_ROL[rol]);
  });

  app.use(crearRutaDisponibilidad(db));
  app.use(crearRutaReservas(db));
  app.use(crearRutaBooking(db));
  app.use(crearRutaAsignacion(db));

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(error);
      res.status(500).send('Ocurrió un error al consultar la disponibilidad.');
    },
  );

  return app;
}
