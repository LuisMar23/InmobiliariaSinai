import { PrismaClient, UserRole } from "../generated/prisma";



const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ============================================================
  // 1. MÓDULOS
  // ============================================================
  const modulosPadre = [
    { clave: 'dashboard', nombre: 'Dashboard' },
    { clave: 'comercial', nombre: 'G. Comercial' },
    { clave: 'finanzas', nombre: 'Finanzas' },
    { clave: 'gestion', nombre: 'Gestión' },
    { clave: 'reportes', nombre: 'Reportes' },
  ];

  for (const modulo of modulosPadre) {
    await prisma.modulo.upsert({
      where: { clave: modulo.clave },
      update: {},
      create: { clave: modulo.clave, nombre: modulo.nombre, activo: true },
    });
  }

  console.log('✅ Módulos padre creados');

  // Obtener IDs de padres
  const comercial = await prisma.modulo.findUnique({ where: { clave: 'comercial' } });
  const finanzas = await prisma.modulo.findUnique({ where: { clave: 'finanzas' } });
  const gestion = await prisma.modulo.findUnique({ where: { clave: 'gestion' } });

  const modulosHijos = [
    // Comercial
    { clave: 'urbanizaciones', nombre: 'Urbanizaciones', padreId: comercial!.id },
    { clave: 'lotes', nombre: 'Lotes', padreId: comercial!.id },
    { clave: 'propiedades', nombre: 'Propiedades', padreId: comercial!.id },
    { clave: 'cotizaciones', nombre: 'Cotizaciones', padreId: comercial!.id },
    { clave: 'ventas', nombre: 'Ventas', padreId: comercial!.id },
    { clave: 'reservas', nombre: 'Reservas', padreId: comercial!.id },
    { clave: 'visitas', nombre: 'Visitas', padreId: comercial!.id },
    { clave: 'promociones', nombre: 'Promociones', padreId: comercial!.id },
    // Finanzas
    { clave: 'caja', nombre: 'Caja', padreId: finanzas!.id },
    { clave: 'gastos', nombre: 'Gastos', padreId: finanzas!.id },
    { clave: 'creditos', nombre: 'Créditos', padreId: finanzas!.id },
    // Gestión
    { clave: 'clientes', nombre: 'Clientes', padreId: gestion!.id },
    { clave: 'usuarios', nombre: 'Usuarios', padreId: gestion!.id },
  ];

  for (const hijo of modulosHijos) {
    await prisma.modulo.upsert({
      where: { clave: hijo.clave },
      update: {},
      create: {
        clave: hijo.clave,
        nombre: hijo.nombre,
        padreId: hijo.padreId,
        activo: true,
      },
    });
  }

  console.log('✅ Módulos hijos creados');

  // ============================================================
  // 2. PERMISOS POR ROL
  // ============================================================
  const todosLosModulos = await prisma.modulo.findMany();

  const getModuloId = (clave: string) => {
    const m = todosLosModulos.find((m) => m.clave === clave);
    if (!m) throw new Error(`Módulo no encontrado: ${clave}`);
    return m.id;
  };

  // Helper para crear permiso
  const permiso = (
    role: UserRole,
    clave: string,
    ver: boolean,
    crear: boolean,
    editar: boolean,
    eliminar: boolean,
  ) => ({
    role,
    moduloId: getModuloId(clave),
    puedeVer: ver,
    puedeCrear: crear,
    puedeEditar: editar,
    puedeEliminar: eliminar,
  });

  const permisos = [
    // ─── ADMINISTRADOR → todo ───────────────────────────────
    ...todosLosModulos.map((m) => ({
      role: UserRole.ADMINISTRADOR,
      moduloId: m.id,
      puedeVer: true,
      puedeCrear: true,
      puedeEditar: true,
      puedeEliminar: true,
    })),

    // ─── ASESOR ─────────────────────────────────────────────
    permiso(UserRole.ASESOR, 'dashboard',      true,  false, false, false),
    permiso(UserRole.ASESOR, 'comercial',      true,  false, false, false),
    permiso(UserRole.ASESOR, 'urbanizaciones', true,  false, false, false),
    permiso(UserRole.ASESOR, 'lotes',          true,  false, false, false),
    permiso(UserRole.ASESOR, 'propiedades',    true,  false, false, false),
    permiso(UserRole.ASESOR, 'cotizaciones',   true,  true,  true,  false),
    permiso(UserRole.ASESOR, 'ventas',         true,  true,  false, false),
    permiso(UserRole.ASESOR, 'reservas',       true,  true,  false, false),
    permiso(UserRole.ASESOR, 'visitas',        true,  true,  true,  false),
    permiso(UserRole.ASESOR, 'promociones',    true,  false, false, false),
    permiso(UserRole.ASESOR, 'gestion',        true,  false, false, false),
    permiso(UserRole.ASESOR, 'clientes',       true,  true,  true,  false),
    // Finanzas: sin acceso
    permiso(UserRole.ASESOR, 'finanzas',       false, false, false, false),
    permiso(UserRole.ASESOR, 'caja',           false, false, false, false),
    permiso(UserRole.ASESOR, 'gastos',         false, false, false, false),
    permiso(UserRole.ASESOR, 'creditos',       true,  false, false, false),
    permiso(UserRole.ASESOR, 'usuarios',       false, false, false, false),
    permiso(UserRole.ASESOR, 'reportes',       false, false, false, false),

    // ─── SECRETARIA ─────────────────────────────────────────
    permiso(UserRole.SECRETARIA, 'dashboard',      true,  false, false, false),
    permiso(UserRole.SECRETARIA, 'comercial',      true,  false, false, false),
    permiso(UserRole.SECRETARIA, 'urbanizaciones', true,  false, false, false),
    permiso(UserRole.SECRETARIA, 'lotes',          true,  false, false, false),
    permiso(UserRole.SECRETARIA, 'propiedades',    true,  false, false, false),
    permiso(UserRole.SECRETARIA, 'cotizaciones',   true,  true,  true,  false),
    permiso(UserRole.SECRETARIA, 'ventas',         true,  false, false, false),
    permiso(UserRole.SECRETARIA, 'reservas',       true,  true,  false, false),
    permiso(UserRole.SECRETARIA, 'visitas',        true,  true,  true,  false),
    permiso(UserRole.SECRETARIA, 'promociones',    true,  false, false, false),
    permiso(UserRole.SECRETARIA, 'gestion',        true,  false, false, false),
    permiso(UserRole.SECRETARIA, 'clientes',       true,  true,  true,  false),
    permiso(UserRole.SECRETARIA, 'finanzas',       true,  false, false, false),
    permiso(UserRole.SECRETARIA, 'caja',           true,  false, false, false),
    permiso(UserRole.SECRETARIA, 'gastos',         true,  false, false, false),
    permiso(UserRole.SECRETARIA, 'creditos',       true,  false, false, false),
    permiso(UserRole.SECRETARIA, 'usuarios',       false, false, false, false),
    permiso(UserRole.SECRETARIA, 'reportes',       true,  false, false, false),

    // ─── USUARIO → solo dashboard ───────────────────────────
    ...todosLosModulos.map((m) => ({
      role: UserRole.USUARIO,
      moduloId: m.id,
      puedeVer: m.clave === 'dashboard',
      puedeCrear: false,
      puedeEditar: false,
      puedeEliminar: false,
    })),
  ];

  for (const p of permisos) {
    await prisma.permisoRole.upsert({
      where: { role_moduloId: { role: p.role, moduloId: p.moduloId } },
      update: {
        puedeVer: p.puedeVer,
        puedeCrear: p.puedeCrear,
        puedeEditar: p.puedeEditar,
        puedeEliminar: p.puedeEliminar,
      },
      create: p,
    });
  }

  console.log('✅ Permisos por rol creados');
  console.log('🎉 Seed completado');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });