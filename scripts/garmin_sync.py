"""Garmin Connect <-> Målmand 8.

MODE=hent-data (standard): henter de sidste 14 dage og gemmer dem krypteret i garmin/data.json.
MODE=send-plan: læser garmin/plan.json (lavet af appen), lægger passene i Garmin-kalenderen og skriver garmin/sent.json.

Formatet matcher gmDecrypt()/gmEncrypt() i app.js: PBKDF2-SHA256 -> AES-GCM-256, alt i base64.
Scriptet skriver aldrig helbredstal i loggen, da Action-loggen er offentlig.
"""
import base64
import datetime as dt
import json
import os
import sys

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from garminconnect import Garmin

FRESH = 7      # de sidste dage hentes altid igen (søvn og skridt ændrer sig, til dagen er slut)
FILL = 14      # ældre dage, der mangler i historikken, hentes lidt ad gangen
BACKFILL = 56  # historikken fyldes op til 8 uger bagud, så trendgraferne har noget at vise
KEEP = 120     # dage, der gemmes i data.json
ACT_DAYS = 14  # aktiviteter hentes for de sidste 14 dage (første gang 8 uger)
ZONE_TYPES = ('soccer', 'football', 'running', 'cardio', 'hiit', 'indoor_cycling', 'cycling')
ITER = 250_000
ROOT = os.path.join(os.path.dirname(__file__), '..', 'garmin')
OUT, PLAN, SENT = (os.path.join(ROOT, f) for f in ('data.json', 'plan.json', 'sent.json'))
FAILS = {}  # funktioner, der fejler gentagne gange (fx HRV på et ældre ur), kaldes ikke mere i denne kørsel


def env(name):
    v = os.environ.get(name, '').strip()
    if not v:
        sys.exit(f'Mangler hemmeligheden {name} (Settings › Secrets and variables › Actions)')
    return v


def num(v):
    return v if isinstance(v, (int, float)) and v > 0 else None


def call(api, name, *args):
    """Kalder en metode i garminconnect. Manglende metoder og fejl giver None, så én dag uden data ikke stopper kørslen."""
    fn = getattr(api, name, None)
    if fn is None or FAILS.get(name, 0) >= 3:
        return None
    try:
        return fn(*args)
    except Exception as e:
        FAILS[name] = FAILS.get(name, 0) + 1
        print(f'  {name} fejlede: {type(e).__name__}')
        return None


def first(v):
    return v[0] if isinstance(v, list) and v else v if isinstance(v, dict) else {}


def day(api, iso):
    s = call(api, 'get_stats', iso) or {}
    sl = (call(api, 'get_sleep_data', iso) or {}).get('dailySleepDTO') or {}
    score = ((sl.get('sleepScores') or {}).get('overall') or {}).get('value')
    secs = num(sl.get('sleepTimeSeconds'))
    hrv = (call(api, 'get_hrv_data', iso) or {}).get('hrvSummary') or {}
    tr = first(call(api, 'get_training_readiness', iso))
    return {
        'date': iso,
        'sleepScore': num(score),
        'sleepMin': round(secs / 60) if secs else None,
        'bbWake': num(s.get('bodyBatteryAtWakeTime')),
        'bbHigh': num(s.get('bodyBatteryHighestValue')),
        'rhr': num(s.get('restingHeartRate')),
        'steps': num(s.get('totalSteps')),
        'stress': num(s.get('averageStressLevel')),
        'hrv': num(hrv.get('lastNightAvg')),
        'hrvWeek': num(hrv.get('weeklyAvg')),
        'hrvStatus': str(hrv.get('status') or '').lower() or None,  # balanced, unbalanced, low, poor
        'ready': num(tr.get('score')),  # Training Readiness 0-100
    }


def ex_sets(api, aid):
    """Sæt, som uret har talt under en styrketræning: [kategori, øvelse, gentagelser, kg]. Garmin gemmer vægten i gram."""
    out = []
    for s in (call(api, 'get_activity_exercise_sets', aid) or {}).get('exerciseSets') or []:
        reps = num(s.get('repetitionCount'))
        if s.get('setType') != 'ACTIVE' or not reps:
            continue
        ex = max(s.get('exercises') or [{}], key=lambda e: e.get('probability') or 0)
        w = num(s.get('weight')) or 0
        kg = w / 1000 if w > 500 else w
        out.append([str(ex.get('category') or ''), str(ex.get('name') or ''), int(reps), round(kg * 2) / 2])
    return out


def zones(api, a, typ):
    """Sekunder i pulszone 1-5. Fra aktivitetens oversigt, ellers et ekstra kald (kun for løb, fodbold og kondition)."""
    z = [num(a.get(f'hrTimeInZone_{i}')) or 0 for i in range(1, 6)]
    if any(z):
        return [round(x) for x in z]
    if not any(t in typ for t in ZONE_TYPES):
        return None
    r = call(api, 'get_activity_hr_in_timezones', a['activityId'])
    if not isinstance(r, list) or not r:
        return None
    by = {int(x.get('zoneNumber') or 0): num(x.get('secsInZone')) or 0 for x in r if isinstance(x, dict)}
    return [round(by.get(i, 0)) for i in range(1, 6)]


def acts(api, start, end, known=None):
    """Aktiviteter. known = tidligere hentede (id -> aktivitet), så sæt og pulszoner ikke hentes igen."""
    known, out, r = known or {}, [], call(api, 'get_activities_by_date', start, end)
    if r is None:
        return None  # kaldet fejlede: behold de aktiviteter, vi har
    for a in r:
        t = str(a.get('startTimeLocal') or '')[:10]
        if not a.get('activityId') or len(t) != 10:
            continue
        typ = (a.get('activityType') or {}).get('typeKey', '')
        old = known.get(str(a['activityId'])) or {}
        rpe = num(a.get('directWorkoutRpe'))  # din egen vurdering på uret ("Hvordan føltes det?"), 10-100
        out.append({
            'id': str(a['activityId']),
            'date': t,
            'min': round((a.get('duration') or 0) / 60),
            'type': typ,
            'name': a.get('activityName') or '',
            'avgHr': num(a.get('averageHR')),
            'maxHr': num(a.get('maxHR')),
            'te': num(a.get('aerobicTrainingEffect')),
            'ate': num(a.get('anaerobicTrainingEffect')),
            'load': num(a.get('activityTrainingLoad')),
            'rpe': round(rpe / 10) if rpe else None,
            'zones': old['zones'] if old.get('zones') else zones(api, a, typ),
            **({'sets': old['sets'] if old.get('sets') else ex_sets(api, a['activityId'])} if 'strength' in typ else {}),
        })
    return out


def vo2(api, dates):
    for iso in reversed(dates[-7:]):
        g = first(call(api, 'get_max_metrics', iso)).get('generic') or {}
        v = num(g.get('vo2MaxPreciseValue')) or num(g.get('vo2MaxValue'))
        if v:
            return round(v, 1)
    return None


def weights(api, start, end):
    out = []
    for w in (call(api, 'get_body_composition', start, end) or {}).get('dateWeightList') or []:
        kg = num(w.get('weight'))
        if kg and w.get('calendarDate'):
            out.append({'date': str(w['calendarDate'])[:10], 'kg': round(kg / 1000 if kg > 500 else kg, 1), 'bf': num(w.get('bodyFat'))})
    return out


def key_for(passphrase, salt, iters):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=iters).derive(passphrase.encode())


def encrypt(obj, passphrase):
    salt, iv = os.urandom(16), os.urandom(12)
    ct = AESGCM(key_for(passphrase, salt, ITER)).encrypt(iv, json.dumps(obj, separators=(',', ':')).encode(), None)  # ct + tag, som WebCrypto forventer
    b = lambda x: base64.b64encode(x).decode()
    return {'v': 1, 'iter': ITER, 'salt': b(salt), 'iv': b(iv), 'ct': b(ct)}


def decrypt(env_, passphrase):
    u = lambda s: base64.b64decode(s)
    key = key_for(passphrase, u(env_['salt']), int(env_['iter']))
    return json.loads(AESGCM(key).decrypt(u(env_['iv']), u(env_['ct']), None))


def previous(passphrase):
    """Den forrige data.json, så historikken bevares og kun nye eller manglende dage hentes."""
    try:
        with open(OUT) as f:
            return decrypt(json.load(f), passphrase)
    except Exception:
        return {}


def fetch_data(api, passphrase):
    today = dt.date.today()
    iso = lambda n: (today - dt.timedelta(days=n)).isoformat()
    prev = previous(passphrase)
    have = {d['date']: d for d in prev.get('days') or [] if isinstance(d, dict) and d.get('date')}
    fresh = [iso(n) for n in range(FRESH - 1, -1, -1)]
    missing = [iso(n) for n in range(FRESH, BACKFILL) if iso(n) not in have][:FILL]
    for d in missing + fresh:
        have[d] = day(api, d)
    cut = iso(KEEP)
    days = sorted((v for k, v in have.items() if k > cut), key=lambda d: d['date'])

    known = {a['id']: a for a in prev.get('acts') or [] if isinstance(a, dict) and a.get('id') and a.get('date', '') > cut}
    first_run = not prev.get('actsFrom') or prev['actsFrom'] > iso(BACKFILL - 1)
    start = iso(BACKFILL - 1) if first_run else iso(ACT_DAYS - 1)
    new = acts(api, start, iso(0), known)
    if new is not None:  # aktiviteter, der er slettet på Garmin i perioden, forsvinder også her
        ids = {a['id'] for a in new}
        known = {k: a for k, a in known.items() if a['date'] < start or k in ids}
        known.update({a['id']: a for a in new})
    ws = {w['date']: w for w in prev.get('weights') or [] if isinstance(w, dict) and w.get('date', '') > cut}
    ws.update({w['date']: w for w in weights(api, iso(ACT_DAYS - 1), iso(0))})
    data = {
        'updated': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
        'days': days,
        'acts': sorted(known.values(), key=lambda a: (a['date'], a['id'])),
        'actsFrom': min(start, prev.get('actsFrom') or start),
        'vo2': vo2(api, fresh) or prev.get('vo2'),
        'weights': sorted(ws.values(), key=lambda w: w['date']),
    }
    print(f'Hentet {len(fresh) + len(missing)} dage ({len(days)} i historikken) og {len(new or [])} aktiviteter ({len(data["acts"])} i alt)')
    os.makedirs(ROOT, exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(encrypt(data, passphrase), f)
    print('Gemt krypteret i garmin/data.json')


# ---------- Send pas til uret ----------
# Trinene i plan.json (se gmBlockSteps i app.js):
#   {t:'set', cat, exn, sets, reps|secs, kg, rest, note}   styrke: sæt med gentagelser (eller tid) og pause
#   {t:'warm'|'work'|'rest', secs, note, cat?, exn?}       tid
#   {t:'reps', note, cat?, exn?}                           tryk på lap-knappen, når du er færdig
# cat/exn er Garmins øvelseskatalog (garminconnect.exercises). Formatet følger bibliotekets create_strength_set().
#   {t:'repeat', n, steps:[...]}                      gentag n gange
SPORT = {'strength': {'sportTypeId': 5, 'sportTypeKey': 'strength_training'}, 'cardio': {'sportTypeId': 6, 'sportTypeKey': 'cardio_training'}}
STEP = {'warm': (1, 'warmup'), 'work': (3, 'interval'), 'rest': (5, 'rest'), 'repeat': (6, 'repeat')}
COND = {'lap': (1, 'lap.button'), 'time': (2, 'time'), 'iter': (7, 'iterations'), 'reps': (10, 'reps')}


def build_workout(w):
    order = [0]

    def nxt():
        order[0] += 1
        return order[0]

    def step(kind, cond, val=None, note='', src=None, kg=0):
        s = {'type': 'ExecutableStepDTO', 'stepOrder': nxt(),
             'stepType': {'stepTypeId': STEP[kind][0], 'stepTypeKey': STEP[kind][1], 'displayOrder': STEP[kind][0]},
             'endCondition': {'conditionTypeId': COND[cond][0], 'conditionTypeKey': COND[cond][1], 'displayOrder': COND[cond][0], 'displayable': True},
             'targetType': {'workoutTargetTypeId': 1, 'workoutTargetTypeKey': 'no.target', 'displayOrder': 1}}
        if val:
            s['endConditionValue'] = float(val)
        if note:
            s['description'] = str(note)[:100]
        if src and src.get('cat') and kind != 'rest':
            s['category'] = src['cat']
            s['exerciseName'] = src.get('exn') or ''  # tom = kun kategorien
        if kg:
            s['weightValue'] = float(kg) * 1000.0  # Garmin gemmer vægten i gram
            s['weightUnit'] = {'unitId': 8, 'unitKey': 'kilogram', 'factor': 1000.0}
        return s

    def repeat(n, kids, skip_rest=None):
        g = {'type': 'RepeatGroupDTO', 'stepOrder': nxt(), 'stepType': {'stepTypeId': 6, 'stepTypeKey': 'repeat', 'displayOrder': 6},
             'numberOfIterations': n, 'smartRepeat': False,
             'endCondition': {'conditionTypeId': 7, 'conditionTypeKey': 'iterations', 'displayOrder': 7, 'displayable': False},
             'endConditionValue': float(n)}
        if skip_rest is not None:
            g['skipLastRestStep'] = skip_rest
        g['workoutSteps'] = kids()  # børnene nummereres efter gruppen
        return g

    def conv(s):
        t = s.get('t')
        if t == 'repeat':
            return [repeat(int(s['n']), lambda: [x for c in s['steps'] for x in conv(c)])]
        if t == 'set':
            def body():
                if s.get('secs'):
                    main = step('work', 'time', int(s['secs']), s.get('note'), s)
                elif s.get('reps'):
                    main = step('work', 'reps', int(s['reps']), s.get('note'), s, s.get('kg') or 0)
                else:
                    main = step('work', 'lap', None, s.get('note'), s)
                return [main] + ([step('rest', 'time', int(s['rest']))] if s.get('rest') else [])
            n = int(s.get('sets') or 1)
            return [repeat(n, body, True if s.get('rest') else None)] if n > 1 else body()
        if t in ('warm', 'work', 'rest') and s.get('secs'):
            return [step(t, 'time', int(s['secs']), s.get('note'), s)]
        return [step('work', 'lap', None, s.get('note'), s)]

    def flat(ss):
        return [x for s in ss for x in [s] + flat(s.get('steps') or [])]

    def secs(ss, n=1):  # anslået varighed: tid, ellers 40 sek pr. sæt eller lap-trin
        return n * sum(secs(s['steps'], int(s['n'])) if s.get('t') == 'repeat'
                       else ((s.get('secs') or 40) + (s.get('rest') or 0)) * int(s.get('sets') or 1) for s in ss)

    strength = any(s.get('cat') for s in flat(w['steps']))  # trin med Garmin-øvelser = styrketræning, ellers kondition
    sport = SPORT['strength' if strength else 'cardio']
    steps = [x for s in w['steps'] for x in conv(s)]
    return {'workoutName': str(w['name'])[:60], 'description': 'Fra Målmand 8', 'sportType': sport,
            'estimatedDurationInSecs': int(secs(w['steps'])),
            'workoutSegments': [{'segmentOrder': 1, 'sportType': sport, 'workoutSteps': steps}]}


def capi(api, method, path, **kw):
    """Direkte kald til Garmin Connect, når garminconnect ikke har en metode til det."""
    g = getattr(api, 'garth', None)
    if g is not None and hasattr(g, 'request'):
        r = g.request(method, 'connectapi', path, api=True, **kw)
        try:
            return r.json()
        except Exception:
            return None
    return api.connectapi(path, method=method, **kw)


def as_json(r):
    return r.json() if hasattr(r, 'json') else r


def upload(api, workout):
    fn = getattr(api, 'upload_workout', None)
    r = as_json(fn(workout)) if fn else capi(api, 'POST', '/workout-service/workout', json=workout)
    wid = (r or {}).get('workoutId') if isinstance(r, dict) else None
    if not wid:
        raise RuntimeError('Garmin returnerede intet workoutId')
    return wid


def schedule(api, wid, date):
    fn = getattr(api, 'schedule_workout', None)
    return fn(wid, date) if fn else capi(api, 'POST', f'/workout-service/schedule/{wid}', json={'date': date})


def delete(api, wid):
    fn = getattr(api, 'delete_workout', None)
    return fn(wid) if fn else capi(api, 'DELETE', f'/workout-service/workout/{wid}')


def send_plan(api, passphrase):
    if not os.path.exists(PLAN):
        sys.exit('garmin/plan.json findes ikke. Send pas fra appen under Mere › Garmin-ur.')
    with open(PLAN) as f:
        try:
            plan = decrypt(json.load(f), passphrase)
        except Exception:
            sys.exit('Kunne ikke låse garmin/plan.json op. Er GARMIN_PASSPHRASE den samme som adgangskoden i appen?')
    old = {}
    if os.path.exists(SENT):
        with open(SENT) as f:
            old = (json.load(f) or {}).get('ids') or {}
    for wid in old.values():  # de pas, der blev sendt sidst, erstattes af de nye
        try:
            delete(api, wid)
        except Exception as e:
            print(f'  Kunne ikke slette et gammelt pas: {type(e).__name__}')
    today = dt.date.today().isoformat()
    out = {'updated': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'), 'ids': {}, 'ok': 0, 'failed': 0, 'errors': []}
    for w in plan.get('workouts') or []:
        if str(w.get('date', '')) < today:
            continue
        try:
            wid = upload(api, build_workout(w))
            schedule(api, wid, w['date'])
            out['ids'][w['key']] = wid
            out['ok'] += 1
        except Exception as e:
            out['failed'] += 1
            out['errors'].append(f'{w.get("date")}: {type(e).__name__}')
            print(f'  Pas {w.get("date")} fejlede: {type(e).__name__}: {str(e)[:300]}')
    os.makedirs(ROOT, exist_ok=True)
    with open(SENT, 'w') as f:
        json.dump(out, f, indent=1)
    print(f'Sendt {out["ok"]} pas til Garmin-kalenderen, {out["failed"]} fejlede')
    if out['failed'] and not out['ok']:
        sys.exit(1)


def main():
    mode = os.environ.get('MODE', 'hent-data').strip() or 'hent-data'
    email, password, passphrase = env('GARMIN_EMAIL'), env('GARMIN_PASSWORD'), env('GARMIN_PASSPHRASE')
    api = Garmin(email, password)
    try:
        api.login()
    except Exception as e:
        sys.exit(f'Login til Garmin Connect fejlede ({type(e).__name__}). Tjek e-mail/adgangskode, og slå evt. totrinsbekræftelse fra.')
    print('Logget ind')
    if mode == 'send-plan':
        send_plan(api, passphrase)
    else:
        fetch_data(api, passphrase)


if __name__ == '__main__':
    main()
