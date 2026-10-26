import requests

BASE = "http://127.0.0.1:8050/api"

# 1. Login as Student
r_stu = requests.post(f"{BASE}/auth/login", data={"username": "student1@college.edu", "password": "student123"})
print("Student login:", r_stu.status_code)
stu_token = r_stu.json()["access_token"]
stu_headers = {"Authorization": f"Bearer {stu_token}"}

# 2. Student asks a doubt
doubt_payload = {
    "job_id": 1,
    "subject": "Eligibility doubt regarding Azure Cloud drive",
    "message": "Dear Coordinator, am I eligible for this drive if I have an ongoing project?"
}
r_doubt = requests.post(f"{BASE}/messages/threads", json=doubt_payload, headers=stu_headers)
print("Create doubt:", r_doubt.status_code, r_doubt.text)
if r_doubt.status_code not in (200, 201):
    exit()

thread_id = r_doubt.json()["id"]
print("Thread ID created:", thread_id)

# 3. Login as Coordinator
r_coord = requests.post(f"{BASE}/auth/login", data={"username": "coordinator.cse@careerbridge.com", "password": "coord123"})
print("Coord login:", r_coord.status_code)
coord_token = r_coord.json()["access_token"]
coord_headers = {"Authorization": f"Bearer {coord_token}"}

# 4. Coordinator gets thread detail
r_detail = requests.get(f"{BASE}/messages/threads/{thread_id}", headers=coord_headers)
print("Coord get thread detail:", r_detail.status_code)

# 5. Coordinator replies
reply_payload = {"content": "Yes, Alice. Ongoing projects do not affect your drive eligibility as long as you meet the 7.5 CGPA criteria."}
r_reply = requests.post(f"{BASE}/messages/threads/{thread_id}/messages", json=reply_payload, headers=coord_headers)
print("Coord reply status:", r_reply.status_code, r_reply.text)
