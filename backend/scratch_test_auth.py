import requests
for url in ['http://127.0.0.1:8000/api/auth/login', 'http://localhost:8000/api/auth/login']:
    try:
        res = requests.post(url, data={'username': 'admin@careerbridge.com', 'password': 'admin123'}, timeout=3)
        print(url, '->', res.status_code, res.json())
    except Exception as e:
        print(url, '-> ERROR:', e)
