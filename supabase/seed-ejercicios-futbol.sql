-- ============================================================
-- PLANTEL — Ejercicios predeterminados de fútbol
-- Pegar en: Supabase > SQL Editor > Run
--
-- ANTES DE CORRER: reemplazá 'TU-EMAIL-DE-PF@ejemplo.com' de la
-- línea de abajo por el email con el que te registraste como
-- preparador físico en Plantel. Si el email no coincide con ningún
-- PF, el script corta con un error claro (no inserta nada a medias).
--
-- Es re-ejecutable: si ya cargaste alguno de estos ejercicios
-- (mismo nombre, mismo PF), lo salta en vez de duplicarlo.
--
-- Los links de video son reales (verificados por búsqueda al momento
-- de escribir este script) pero elegí los que te parezcan mejores
-- para tu plantel y reemplazalos cuando quieras desde «Ejercicios».
-- Las fotos de referencia quedan vacías a propósito: subilas vos
-- desde «Ejercicios» → así controlás calidad y derechos de la imagen.
-- ============================================================

do $$
declare
  v_pf_id uuid;
begin
  select p.id into v_pf_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = 'TU-EMAIL-DE-PF@ejemplo.com'
    and p.rol = 'pf';

  if v_pf_id is null then
    raise exception 'No encontré un preparador físico con ese email. Editá este script y reemplazá TU-EMAIL-DE-PF@ejemplo.com por el email con el que te registraste como PF en Plantel.';
  end if;

  insert into public.ejercicios (pf_id, nombre, descripcion, video_url, categoria)
  select v_pf_id, v.nombre, v.descripcion, v.video_url, v.categoria
  from (values
    (
      'Activación dinámica',
      'Movilidad de cadera, tobillo y rodilla + activación de glúteo antes de entrenar o jugar. 8-10 minutos, sin llegar a la fatiga.',
      'https://www.youtube.com/watch?v=U5bhdlksi0Y',
      'calentamiento'
    ),
    (
      'Skipping / ABC de carrera',
      'Técnica de carrera con skipping bajo, alto y talón-glúteo. Activación neuromuscular antes de trabajos de velocidad.',
      'https://www.youtube.com/watch?v=pBhcWdCu9xQ',
      'calentamiento'
    ),
    (
      'Sentadilla con barra',
      'Base de la fuerza de tren inferior. Espalda neutra, rodillas en línea con los pies, bajar hasta paralela o un poco más.',
      'https://www.youtube.com/watch?v=sI-CVQ1kfmc',
      'fuerza'
    ),
    (
      'Peso muerto rumano',
      'Isquiotibiales y glúteo, clave para prevenir desgarros. Barra pegada al cuerpo, espalda neutra, bisagra de cadera sin flexionar de más la rodilla.',
      'https://www.youtube.com/watch?v=rjvlSfZ-PQw',
      'fuerza'
    ),
    (
      'Zancada con mancuernas',
      'Fuerza unilateral de pierna, muy transferible al gesto de carrera y a los cambios de apoyo. Tronco erguido, rodilla de atrás sin golpear el piso.',
      'https://www.youtube.com/watch?v=1O543yIxtIY',
      'fuerza'
    ),
    (
      'Hip thrust',
      'Potencia de glúteo para el sprint y el salto. Espalda alta apoyada en el banco, mentón metido, extensión completa de cadera arriba.',
      'https://www.youtube.com/watch?v=HYhnS0mln-E',
      'fuerza'
    ),
    (
      'Cambios de dirección',
      'Circuito de conos con frenado, cambio de apoyo y reaceleración. Agilidad específica del fútbol.',
      'https://www.youtube.com/watch?v=kXpg8GYlNbE',
      'campo'
    ),
    (
      'Rondo de posesión',
      'Posesión en espacio reducido para trabajar el primer toque, la orientación corporal y la presión. Ajustar el tamaño según la categoría.',
      'https://www.youtube.com/watch?v=sinUlIIKn-g',
      'campo'
    ),
    (
      'Resistencia interválica en cancha',
      'Series de intensidad alta con pausas cortas (ej. 4 min de trabajo / 3 min de pausa activa) para desarrollar la capacidad aeróbica específica del partido.',
      'https://www.youtube.com/watch?v=sSZDVgv9d6M',
      'campo'
    ),
    (
      'Nordic hamstring curl',
      'El ejercicio con mejor evidencia para reducir lesiones de isquiotibiales. Bajar lo más lento y controlado posible, ayudándose con las manos al final si hace falta.',
      'https://www.youtube.com/watch?v=dBF0m_7tB0E',
      'prevencion'
    ),
    (
      'Copenhagen plank (aductores)',
      'Fuerza de aductores para prevenir pubalgia y desgarros. Empezar con la progresión más fácil (rodilla apoyada) antes de pasar a pierna extendida.',
      'https://www.youtube.com/watch?v=XayLPx8fgsc',
      'prevencion'
    ),
    (
      'Propiocepción de tobillo',
      'Equilibrio en un pie sobre superficie estable, inestable y con ojos cerrados, para prevenir esguinces y reincidencias.',
      'https://www.youtube.com/watch?v=S9xGi7OBfqc',
      'prevencion'
    )
  ) as v(nombre, descripcion, video_url, categoria)
  where not exists (
    select 1 from public.ejercicios e
    where e.pf_id = v_pf_id and e.nombre = v.nombre
  );
end $$;
