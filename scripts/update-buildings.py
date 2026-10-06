"""Refresh public government registry; only publish after every source succeeds."""
import datetime, json, pathlib, urllib.request, urllib.parse
BASE = 'https://portal.csdi.gov.hk/server/rest/services/common/'
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
for service, key, field in [('bd_rcd_1631168029910_44937', 'inspection', 'Cum_MBIS_Notice_Issued_EN'), ('bd_rcd_1631167799285_82457', 'repair', 'Cum_s26Orders_Issued_EN'), ('bd_rcd_1696920579106_13347', 'inspectionResolved', 'Cum_MBIS_Notice_CW_WD_SS_EN'), ('bd_rcd_1696920940144_71128', 'repairResolved', 'Cum_s26Orders_CW_WD_SS_EN')]:
    rows = list(records(service+'/MapServer'))
    counts[key] = len(rows)
    updates[key] = max((str(r.get('LastUpdate') or '') for r in rows), default='')
    for r in rows:
        for csuid in (r.get('CSUID_EN') or '').split(','):
            if csuid.strip():
                entry = registry.setdefault(csuid.strip(), {})
                entry.setdefault(key, []).append(dict(block=str(r.get('BLOCK_ID_EN')), count=int(r.get(field) or 0), address=r.get('AddressTC') or r.get('AddressEN')))
    print(key, len(rows), flush=True)
out = dict(fetchedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), opCount=len(ops), matchedCount=sum(bool(v.get('records')) for v in registry.values()), counts=counts, updates=updates, buildings=registry)
p = pathlib.Path(__file__).resolve().parent.parent/'data/building-registry.json'
tmp=p.with_suffix('.tmp'); tmp.write_text(json.dumps(out, ensure_ascii=False, separators=(',',':'))); tmp.replace(p)
