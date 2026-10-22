"""Henter de sidste 14 dage fra Garmin Connect og gemmer dem krypteret i garmin/data.json.

Formatet matcher gmDecrypt() i app.js: PBKDF2-SHA256 -> AES-GCM-256, alt i base64.
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

DAYS = 14
ITER = 250_000
OUT = os.path.join(os.path.dirname(__file__), '..', 'garmin', 'data.json')


def env(name):
    v = os.environ.get(name, '').strip()
    if not v:
        sys.exit(f'Mangler hemmeligheden {name} (Settings › Secrets and variables › Actions)')
    return v


def num(v):
    return v if isinstance(v, (int, float)) and v > 0 else None


def safe(fn, *args):
    try:
        return fn(*args)
    except Exception as e:  # en enkelt dag uden data må ikke stoppe hele kørslen
        print(f'  {fn.__name__} fejlede: {type(e).__name__}')
        return None


def day(api, iso):
    s = safe(api.get_stats, iso) or {}
    sl = (safe(api.get_sleep_data, iso) or {}).get('dailySleepDTO') or {}
    score = ((sl.get('sleepScores') or {}).get('overall') or {}).get('value')
    secs = num(sl.get('sleepTimeSeconds'))
    return {
        'date': iso,
        'sleepScore': num(score),
        'sleepMin': round(secs / 60) if secs else None,
        'bbWake': num(s.get('bodyBatteryAtWakeTime')),
        'bbHigh': num(s.get('bodyBatteryHighestValue')),
        'rhr': num(s.get('restingHeartRate')),
        'steps': num(s.get('totalSteps')),
        'stress': num(s.get('averageStressLevel')),
    }


def acts(api, start, end):
    out = []
    for a in safe(api.get_activities_by_date, start, end) or []:
        t = str(a.get('startTimeLocal') or '')[:10]
        if not a.get('activityId') or len(t) != 10:
            continue
        out.append({
            'id': str(a['activityId']),
            'date': t,
            'min': round((a.get('duration') or 0) / 60),
            'type': (a.get('activityType') or {}).get('typeKey', ''),
            'name': a.get('activityName') or '',
            'avgHr': num(a.get('averageHR')),
            'maxHr': num(a.get('maxHR')),
        })
    return out


def encrypt(obj, passphrase):
    salt, iv = os.urandom(16), os.urandom(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(passphrase.encode())
    ct = AESGCM(key).encrypt(iv, json.dumps(obj, separators=(',', ':')).encode(), None)  # ct + tag, som WebCrypto forventer
    b = lambda x: base64.b64encode(x).decode()
    return {'v': 1, 'iter': ITER, 'salt': b(salt), 'iv': b(iv), 'ct': b(ct)}


def main():
    email, password, passphrase = env('GARMIN_EMAIL'), env('GARMIN_PASSWORD'), env('GARMIN_PASSPHRASE')
    api = Garmin(email, password)
    try:
        api.login()
    except Exception as e:
        sys.exit(f'Login til Garmin Connect fejlede ({type(e).__name__}). Tjek e-mail/adgangskode, og slå evt. totrinsbekræftelse fra.')
    print('Logget ind')

    today = dt.date.today()
    dates = [(today - dt.timedelta(days=i)).isoformat() for i in range(DAYS - 1, -1, -1)]
    days = [day(api, d) for d in dates]
    data = {
        'updated': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
        'days': days,
        'acts': acts(api, dates[0], dates[-1]),
    }
    print(f'Hentet {len(days)} dage og {len(data["acts"])} aktiviteter')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(encrypt(data, passphrase), f)
    print('Gemt krypteret i garmin/data.json')


if __name__ == '__main__':
    main()
