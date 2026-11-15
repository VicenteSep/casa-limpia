do $$
declare r uuid;
  sat date := date_trunc('week', current_date)::date + case when extract(isodow from current_date)=7 then 12 else 5 end;
begin
  insert into rooms(name, sort, default_assignee) values ('Cocina', 1, 'vicho') returning id into r;
  insert into tasks(room_id, name, every_n, every_unit, next_due, points) values
    (r, 'Barrer', 1, 'week', sat + 0, 10),
    (r, 'Lavar loza', 1, 'week', sat + 0, 10),
    (r, 'Limpiar mesones', 1, 'week', sat + 0, 10),
    (r, 'Limpiar campana', 1, 'month', sat + 0, 20),
    (r, 'Limpiar desagüe', 1, 'month', sat + 7, 20),
    (r, 'Limpiar frutero', 1, 'month', sat + 14, 20),
    (r, 'Limpiar horno', 1, 'month', sat + 21, 20),
    (r, 'Limpiar lavaplatos', 1, 'week', sat + 0, 10),
    (r, 'Limpiar refri', 1, 'month', sat + 0, 20),
    (r, 'Limpiar secalozas', 1, 'month', sat + 7, 20),
    (r, 'Pañito basurero', 1, 'week', sat + 0, 10),
    (r, 'Pañito electrodomésticos', 1, 'week', sat + 0, 10),
    (r, 'Pañito muebles', 1, 'week', sat + 0, 10),
    (r, 'Pañito refri', 1, 'week', sat + 0, 10),
    (r, 'Sacar basura y reciclaje', 1, 'week', sat + 0, 10),
    (r, 'Trapear y enjuagar', 2, 'week', sat + 0, 15),
    (r, 'Vitrocerámica', 1, 'week', sat + 0, 10);
  insert into rooms(name, sort, default_assignee) values ('Living', 2, null) returning id into r;
  insert into tasks(room_id, name, every_n, every_unit, next_due, points) values
    (r, 'Aspirar', 2, 'week', sat + 7, 15),
    (r, 'Barrer', 1, 'week', sat + 0, 10),
    (r, 'Lavar fuente gatos', 1, 'week', sat + 0, 10),
    (r, 'Limpiar comedero gatos', 1, 'week', sat + 0, 10),
    (r, 'Limpiar mesas', 1, 'week', sat + 0, 10),
    (r, 'Limpiar muebles', 1, 'month', sat + 14, 20),
    (r, 'Limpiar ventanas', 3, 'month', sat + 0, 30),
    (r, 'Ordenar', 1, 'week', sat + 0, 10),
    (r, 'Ordenar recibidor', 1, 'week', sat + 0, 10),
    (r, 'Regar plantas', 2, 'week', sat + 0, 15),
    (r, 'Trapear', 1, 'month', sat + 21, 20);
  insert into rooms(name, sort, default_assignee) values ('Pieza', 3, null) returning id into r;
  insert into tasks(room_id, name, every_n, every_unit, next_due, points) values
    (r, 'Barrer', 1, 'week', sat + 0, 10),
    (r, 'Basura veladores', 1, 'week', sat + 0, 10),
    (r, 'Cambiar sábanas', 2, 'week', sat + 7, 15),
    (r, 'Guardar ropa limpia', 1, 'week', sat + 0, 10),
    (r, 'Hacer cama', 2, 'week', sat + 0, 15),
    (r, 'Lavar cubrecamas', 3, 'month', sat + 21, 30),
    (r, 'Lavar ropa', 1, 'week', sat + 0, 10),
    (r, 'Regar plantas', 2, 'week', sat + 7, 15);
  insert into rooms(name, sort, default_assignee) values ('Pieza chica', 4, null) returning id into r;
  insert into tasks(room_id, name, every_n, every_unit, next_due, points) values
    (r, 'Aspirar', 2, 'week', sat + 0, 15),
    (r, 'Barrer', 1, 'week', sat + 0, 10),
    (r, 'Ordenar', 1, 'week', sat + 0, 10);
  insert into rooms(name, sort, default_assignee) values ('Baño', 5, 'cami') returning id into r;
  insert into tasks(room_id, name, every_n, every_unit, next_due, points) values
    (r, 'Barrer', 1, 'week', sat + 0, 10),
    (r, 'Cambiar toalla manos', 1, 'week', sat + 0, 10),
    (r, 'Ducha', 1, 'month', sat + 0, 20),
    (r, 'Espejo', 1, 'week', sat + 0, 10),
    (r, 'Lavamanos', 1, 'week', sat + 0, 10),
    (r, 'Lavar toallas Popa', 1, 'month', sat + 7, 20),
    (r, 'Lavar toallas Popo', 1, 'month', sat + 14, 20),
    (r, 'Limpiar alfombrilla', 1, 'month', sat + 21, 20),
    (r, 'Murallas', 1, 'week', sat + 0, 10),
    (r, 'Piso ducha', 1, 'week', sat + 0, 10),
    (r, 'Sacar basura', 1, 'week', sat + 0, 10),
    (r, 'Trapear', 1, 'month', sat + 0, 20),
    (r, 'Vasito cepillos', 1, 'week', sat + 0, 10),
    (r, 'Water', 1, 'week', sat + 0, 10);
  insert into rooms(name, sort, default_assignee) values ('Baño chico', 6, null) returning id into r;
  insert into tasks(room_id, name, every_n, every_unit, next_due, points) values
    (r, 'Barrer', 1, 'week', sat + 0, 10),
    (r, 'Cambiar arenas', 1, 'month', sat + 7, 20),
    (r, 'Trapear', 1, 'month', sat + 14, 20);
end $$;
