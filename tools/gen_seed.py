import json
ROOMS = [
 ("Cocina","vicho",[("Barrer",1,"week"),("Lavar loza",1,"week"),("Limpiar mesones",1,"week"),("Limpiar campana",1,"month"),("Limpiar desagüe",1,"month"),("Limpiar frutero",1,"month"),("Limpiar horno",1,"month"),("Limpiar lavaplatos",1,"week"),("Limpiar refri",1,"month"),("Limpiar secalozas",1,"month"),("Pañito basurero",1,"week"),("Pañito electrodomésticos",1,"week"),("Pañito muebles",1,"week"),("Pañito refri",1,"week"),("Sacar basura y reciclaje",1,"week"),("Trapear y enjuagar",2,"week"),("Vitrocerámica",1,"week")]),
 ("Living",None,[("Aspirar",2,"week"),("Barrer",1,"week"),("Lavar fuente gatos",1,"week"),("Limpiar comedero gatos",1,"week"),("Limpiar mesas",1,"week"),("Limpiar muebles",1,"month"),("Limpiar ventanas",3,"month"),("Ordenar",1,"week"),("Ordenar recibidor",1,"week"),("Regar plantas",2,"week"),("Trapear",1,"month")]),
 ("Pieza",None,[("Barrer",1,"week"),("Basura veladores",1,"week"),("Cambiar sábanas",2,"week"),("Guardar ropa limpia",1,"week"),("Hacer cama",2,"week"),("Lavar cubrecamas",3,"month"),("Lavar ropa",1,"week"),("Regar plantas",2,"week")]),
 ("Pieza chica",None,[("Aspirar",2,"week"),("Barrer",1,"week"),("Ordenar",1,"week")]),
 ("Baño","cami",[("Barrer",1,"week"),("Cambiar toalla manos",1,"week"),("Ducha",1,"month"),("Espejo",1,"week"),("Lavamanos",1,"week"),("Lavar toallas Popa",1,"month"),("Lavar toallas Popo",1,"month"),("Limpiar alfombrilla",1,"month"),("Murallas",1,"week"),("Piso ducha",1,"week"),("Sacar basura",1,"week"),("Trapear",1,"month"),("Vasito cepillos",1,"week"),("Water",1,"week")]),
 ("Baño chico",None,[("Barrer",1,"week"),("Cambiar arenas",1,"month"),("Trapear",1,"month")]),
]
def points(n,u):
    days = n*{"day":1,"week":7,"month":30}[u]
    return 10 if days<=7 else 15 if days<=14 else 20 if days<=31 else 30
counters={}
def offset(n,u):
    key=(n,u); i=counters.get(key,0); counters[key]=i+1
    days = n*{"day":1,"week":7,"month":30}[u]
    slots = max(1, round(days/7))
    return 7*(i % min(slots,6)) + (14 if slots>6 and i%2 else 0)
out=[]
for sort,(name,da,tasks) in enumerate(ROOMS,1):
    out.append({"name":name,"sort":sort,"default_assignee":da,"tasks":[{"name":t,"every_n":n,"every_unit":u,"offset":offset(n,u),"points":points(n,u)} for t,n,u in tasks]})
open("seed.js","w").write("// Generado por tools/gen_seed.py — tareas iniciales (las mismas que el SQL)\nexport const SEED = "+json.dumps(out,ensure_ascii=False,indent=1)+";\n")
def q(s): return "'"+s.replace("'","''")+"'"
sql=["do $$\ndeclare r uuid;\n  sat date := date_trunc('week', current_date)::date + case when extract(isodow from current_date)=7 then 12 else 5 end;\nbegin"]
for room in out:
    da = q(room["default_assignee"]) if room["default_assignee"] else "null"
    sql.append(f"  insert into rooms(name, sort, default_assignee) values ({q(room['name'])}, {room['sort']}, {da}) returning id into r;")
    vals=",\n    ".join(f"(r, {q(t['name'])}, {t['every_n']}, '{t['every_unit']}', sat + {t['offset']}, {t['points']})" for t in room["tasks"])
    sql.append(f"  insert into tasks(room_id, name, every_n, every_unit, next_due, points) values\n    {vals};")
sql.append("end $$;")
open("supabase/seed.sql","w").write("\n".join(sql)+"\n")
print(sum(len(r["tasks"]) for r in out),"tareas")
