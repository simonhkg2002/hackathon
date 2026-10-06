"""Refresh public government registry; only publish after every source succeeds."""
import datetime, json, pathlib, urllib.request, urllib.parse
BASE = 'https://portal.csdi.gov.hk/server/rest/services/common/'
DISTRICTS_URL = 'https://www.had.gov.hk/psi/hong-kong-administrative-boundaries/hksar_18_district_boundary.json'
def get(url):
    for attempt in range(3):
        try:
            return urllib.request.urlopen(url, timeout=90).read()
        except Exception:
            if attempt == 2: raise

def records(service, layer=0):
    offset = 0
    while True:
        q = urllib.parse.urlencode(dict(f='json', where='1=1', outFields='*', returnGeometry='false', orderByFields='OBJECTID', resultOffset=offset, resultRecordCount=2000))
        j = json.loads(get(BASE+service+'/'+str(layer)+'/query?'+q))
        if 'error' in j: raise RuntimeError(j['error'])
        rows = [f['attributes'] for f in j['features']]
        yield from rows
        offset += len(rows)
        if not j.get('exceededTransferLimit') and len(rows) < 2000: break
        if not rows: raise RuntimeError('Incomplete pagination')

service = 'landsd_rcd_1637211194312_35158/FeatureServer'
ops = {r['OPNo']: r for r in records(service, 1004)}
structures = {r['BuildingStructureID']: r for r in records(service, 1003)}
registry = {}
relations = 0
for r in records(service, 1002):
    structure = structures.get(r['BuildingStructureID'])
    if structure:
        op = ops.get(structure['OPNo'], {})
        timestamp = op.get('OPDate')
        date = datetime.datetime.fromtimestamp(timestamp/1000, datetime.timezone(datetime.timedelta(hours=8))).strftime('%Y-%m-%d') if timestamp is not None else ''
        row = dict(block=str(r['BuildingStructureID']), address='', op=structure['OPNo'], date=date, usage=structure.get('OPBuildingType') or '', district='')
        existing = registry.setdefault(r['BuildingCSUID'], {}).setdefault('records', [])
        if row not in existing: existing.append(row)
    relations += 1
print('Occupation permits', len(ops), 'official relations', relations, 'matched geometries', len(registry), flush=True)
counts = {}
updates = {}
repair_rows = []
for service, key, field in [('bd_rcd_1631168029910_44937', 'inspection', 'Cum_MBIS_Notice_Issued_EN'), ('bd_rcd_1631167799285_82457', 'repair', 'Cum_s26Orders_Issued_EN'), ('bd_rcd_1696920579106_13347', 'inspectionResolved', 'Cum_MBIS_Notice_CW_WD_SS_EN'), ('bd_rcd_1696920940144_71128', 'repairResolved', 'Cum_s26Orders_CW_WD_SS_EN')]:
    rows = list(records(service+'/MapServer'))
    if key == 'repair': repair_rows = rows
    counts[key] = len(rows)
    updates[key] = max((str(r.get('LastUpdate') or '') for r in rows), default='')
    for r in rows:
        for csuid in (r.get('CSUID_EN') or '').split(','):
            if csuid.strip():
                entry = registry.setdefault(csuid.strip(), {})
                entry.setdefault(key, []).append(dict(block=str(r.get('BLOCK_ID_EN')), count=int(r.get(field) or 0), address=r.get('AddressTC') or r.get('AddressEN')))
    print(key, len(rows), flush=True)

def inside_ring(x, y, ring):
    inside = False
    previous = ring[-1]
    for current in ring:
        x1, y1 = previous
        x2, y2 = current
        if (y1 > y) != (y2 > y) and x < (x2-x1)*(y-y1)/(y2-y1)+x1:
            inside = not inside
        previous = current
    return inside

def inside_polygon(x, y, rings):
    return inside_ring(x, y, rings[0]) and not any(inside_ring(x, y, hole) for hole in rings[1:])

boundaries = json.loads(get(DISTRICTS_URL))['features']
districts = []
for feature in boundaries:
    rings = feature['geometry']['coordinates']
    if feature['geometry']['type'] != 'Polygon': raise RuntimeError('Unexpected district geometry')
    outer = rings[0]
    districts.append(dict(name=feature['properties']['地區'], rings=rings,
                          bbox=(min(p[0] for p in outer), min(p[1] for p in outer),
                                max(p[0] for p in outer), max(p[1] for p in outer)),
                          orders=0, buildings=0))
if len(districts) != 18: raise RuntimeError('Expected 18 districts')
unmatched = 0
seen_blocks = set()
for row in repair_rows:
    block = str(row.get('BLOCK_ID_EN') or '').strip()
    if not block or block in seen_blocks: raise RuntimeError('Missing or duplicate repair block ID')
    seen_blocks.add(block)
    x, y = float(row['Longitude']), float(row['Latitude'])
    matches = [d for d in districts if d['bbox'][0] <= x <= d['bbox'][2]
               and d['bbox'][1] <= y <= d['bbox'][3] and inside_polygon(x, y, d['rings'])]
    if len(matches) > 1: raise RuntimeError('Repair block belongs to multiple districts')
    if not matches:
        unmatched += 1
        continue
    matches[0]['orders'] += int(row['Cum_s26Orders_Issued_EN'] or 0)
    matches[0]['buildings'] += 1
district_counts = sorted(({k: d[k] for k in ('name','orders','buildings')} for d in districts),
                         key=lambda d: (-d['orders'], d['name']))
fetched_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
district_stats = dict(fetchedAt=fetched_at, repairLastUpdate=updates['repair'],
                      orderSource='https://data.gov.hk/en-data/dataset/hk-bd-opendata-s26-order-1',
                      boundarySource=DISTRICTS_URL, totalOrders=sum(int(r['Cum_s26Orders_Issued_EN'] or 0) for r in repair_rows),
                      totalBuildings=len(repair_rows), unmatchedBuildings=unmatched,
                      districts=district_counts)
if sum(d['buildings'] for d in district_counts) + unmatched != len(repair_rows):
    raise RuntimeError('District assignment is incomplete')
print('District ranking', district_counts[:3], 'unmatched', unmatched, flush=True)
out = dict(fetchedAt=fetched_at, opCount=len(ops), matchedCount=sum(bool(v.get('records')) for v in registry.values()), counts=counts, updates=updates, buildings=registry)
p = pathlib.Path(__file__).resolve().parent.parent/'data/building-registry.json'
tmp=p.with_suffix('.tmp'); tmp.write_text(json.dumps(out, ensure_ascii=False, separators=(',',':')))
stats_path = p.with_name('district-repair-stats.json')
stats_tmp = stats_path.with_suffix('.tmp')
stats_tmp.write_text(json.dumps(district_stats, ensure_ascii=False, indent=2) + '\n')
tmp.replace(p)
stats_tmp.replace(stats_path)
