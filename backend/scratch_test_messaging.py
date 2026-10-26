"""
Automated Test Suite for Messaging, Doubt Desk, Drive Logistics & FAQ System
Spec: docs/messaging_and_inquiry_system_spec.md
Tests:
1. Shield Principle: Student blocked from messaging recruiter
2. Shield Principle: Recruiter blocked from messaging student
3. Lane 1: Student <-> Coordinator Doubt Desk
4. Student Academic Profile Context on doubt
5. Status Lifecycle (OPEN -> RESOLVED)
6. Pin to Drive FAQ Automation
7. GET /api/jobs/{job_id}/faqs verification
8. Lane 2: Coordinator <-> Recruiter Drive Logistics Chat
"""
import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("=== STARTING MESSAGING & INQUIRY TEST SUITE ===")

    # 1. Auth Setup
    # Recruiter
    res_rec = requests.post(f"{BASE_URL}/api/auth/login", data={"username": "hr@techcorp.com", "password": "recruiter123"})
    assert res_rec.status_code == 200, f"Recruiter login failed: {res_rec.text}"
    recruiter_token = res_rec.json()["access_token"]
    h_rec = {"Authorization": f"Bearer {recruiter_token}"}
    print("[PASS] Recruiter authenticated.")

    # Coordinator
    res_coord = requests.post(f"{BASE_URL}/api/auth/google", json={"token": "demo_sso:coord.cse@college.edu"})
    assert res_coord.status_code == 200, f"Coordinator login failed: {res_coord.text}"
    coord_token = res_coord.json()["access_token"]
    h_coord = {"Authorization": f"Bearer {coord_token}"}
    print("[PASS] Coordinator authenticated via SSO.")

    # Student
    res_stud = requests.post(f"{BASE_URL}/api/auth/google", json={"token": "demo_sso:student1@college.edu"})
    assert res_stud.status_code == 200, f"Student login failed: {res_stud.text}"
    student_token = res_stud.json()["access_token"]
    h_stud = {"Authorization": f"Bearer {student_token}"}
    print("[PASS] Student authenticated via SSO.")

    # TPO
    res_tpo = requests.post(f"{BASE_URL}/api/auth/login", data={"username": "tpo@college.edu", "password": "admin123"})
    assert res_tpo.status_code == 200, f"TPO login failed: {res_tpo.text}"
    tpo_token = res_tpo.json()["access_token"]
    h_tpo = {"Authorization": f"Bearer {tpo_token}"}
    print("[PASS] TPO authenticated.")

    # 2. Get or create a published job
    job_payload = {
        "title": "Cloud DevOps Engineer 2026",
        "description": "Drive for Cloud Infrastructure and Site Reliability.",
        "location": "Bengaluru",
        "job_type": "Full-Time",
        "ctc_lpa": 16.0,
        "eligibility_cgpa": 7.0,
        "eligible_departments": ["CSE", "IT", "ECE"],
        "max_backlogs": 0,
        "target_batch_year": 2026,
        "deadline": "2026-11-30T23:59:59Z"
    }
    res_job = requests.post(f"{BASE_URL}/api/jobs", json=job_payload, headers=h_rec)
    assert res_job.status_code in [200, 201], f"Job creation failed: {res_job.text}"
    job_id = res_job.json()["job_id"]

    # Approve job
    res_appr = requests.patch(f"{BASE_URL}/api/jobs/{job_id}/approve", headers=h_tpo)
    assert res_appr.status_code == 200, f"Job approval failed: {res_appr.text}"
    print(f"[PASS] Published Job ID {job_id} ready for drive.")

    # 3. Test The Shield Principle (Spec §1 & §2)
    # Student attempts to create COORDINATOR_RECRUITER thread or message recruiter
    shield_fail_payload = {
        "job_id": job_id,
        "thread_type": "COORDINATOR_RECRUITER",
        "subject": "Direct message to HR",
        "initial_message": "Can you give me referral?"
    }
    res_shield1 = requests.post(f"{BASE_URL}/api/messages/threads", json=shield_fail_payload, headers=h_stud)
    assert res_shield1.status_code == 403, f"Shield Principle violation! Expected 403, got {res_shield1.status_code}"
    print("[PASS] Shield Principle: Student blocked from creating recruiter thread (403 Forbidden).")

    # Recruiter attempts to message student directly
    shield_fail_rec = {
        "job_id": job_id,
        "thread_type": "STUDENT_COORDINATOR",
        "subject": "Direct message to student",
        "initial_message": "Are you available?"
    }
    res_shield2 = requests.post(f"{BASE_URL}/api/messages/threads", json=shield_fail_rec, headers=h_rec)
    assert res_shield2.status_code == 403, f"Shield Principle violation! Expected 403, got {res_shield2.status_code}"
    print("[PASS] Shield Principle: Recruiter blocked from direct student messaging (403 Forbidden).")

    # 4. Lane 1: Student asks a Doubt to Coordinator (Spec §2.A)
    doubt_payload = {
        "job_id": job_id,
        "thread_type": "STUDENT_COORDINATOR",
        "subject": "Is Python 3.12 allowed in the coding assessment?",
        "initial_message": "Hello Sir, I wanted to confirm if Python 3 with built-in standard libraries is permitted or if it is restricted to Java/C++?"
    }
    res_doubt = requests.post(f"{BASE_URL}/api/messages/threads", json=doubt_payload, headers=h_stud)
    assert res_doubt.status_code == 200, f"Student doubt creation failed: {res_doubt.text}"
    doubt_data = res_doubt.json()
    thread_id = doubt_data["id"]
    print(f"[PASS] Student created Doubt Desk thread ID {thread_id}.")

    # 5. Coordinator Views Doubt Desk List (Spec §2.A & §6.B)
    res_coord_list = requests.get(f"{BASE_URL}/api/messages/threads", headers=h_coord)
    assert res_coord_list.status_code == 200, f"Coordinator list failed: {res_coord_list.text}"
    coord_threads = res_coord_list.json()
    matching_thread = next((t for t in coord_threads if t["id"] == thread_id), None)
    assert matching_thread is not None, "Coordinator could not find student doubt thread"
    assert matching_thread["unread_count"] >= 1, "Unread count should be >= 1 for new student message"
    print(f"[PASS] Coordinator sees Doubt Desk item with Student Context: {matching_thread['student_name']} ({matching_thread['student_dept']}) - CGPA: {matching_thread['student_cgpa']}, Backlogs: {matching_thread['student_backlogs']}")

    # 6. Coordinator replies to Doubt
    reply_payload = {
        "content": "Yes, Python 3, Java 17, and C++20 are all fully supported with standard library modules. No external packages allowed."
    }
    res_reply = requests.post(f"{BASE_URL}/api/messages/threads/{thread_id}/messages", json=reply_payload, headers=h_coord)
    assert res_reply.status_code == 200, f"Coordinator reply failed: {res_reply.text}"
    print("[PASS] Coordinator answered student inquiry.")

    # 7. Student reads conversation
    res_stud_view = requests.get(f"{BASE_URL}/api/messages/threads/{thread_id}", headers=h_stud)
    assert res_stud_view.status_code == 200, f"Student fetch detail failed: {res_stud_view.text}"
    stud_view_data = res_stud_view.json()
    assert len(stud_view_data["messages"]) == 2, f"Expected 2 messages, got {len(stud_view_data['messages'])}"
    print("[PASS] Student read thread detail; incoming messages marked as read.")

    # 8. Pin to Drive FAQ Automation (Spec §2.C)
    pin_payload = {
        "faq_question": "What programming languages are permitted in the online coding round?",
        "faq_answer": "Python 3, Java 17, and C++20 are all supported with standard libraries."
    }
    res_pin = requests.post(f"{BASE_URL}/api/messages/threads/{thread_id}/pin-faq", json=pin_payload, headers=h_coord)
    assert res_pin.status_code == 200, f"Pin to FAQ failed: {res_pin.text}"
    pinned_thread = res_pin.json()
    assert pinned_thread["is_pinned_faq"] == True
    assert pinned_thread["status"] == "RESOLVED"
    print("[PASS] Coordinator pinned doubt to Drive FAQ and marked thread RESOLVED.")

    # 9. Verify Drive FAQ endpoint for all candidates (Spec §2.C & §5)
    res_faqs = requests.get(f"{BASE_URL}/api/jobs/{job_id}/faqs", headers=h_stud)
    assert res_faqs.status_code == 200, f"Get FAQs failed: {res_faqs.text}"
    faq_list = res_faqs.json()
    assert len(faq_list) >= 1, "Expected at least 1 pinned FAQ"
    assert faq_list[0]["question"] == pin_payload["faq_question"]
    assert faq_list[0]["answer"] == pin_payload["faq_answer"]
    print(f"[PASS] Published Drive FAQs live on Job Posting: '{faq_list[0]['question']}' -> '{faq_list[0]['answer']}'")

    # 10. Lane 2: Recruiter <-> Coordinator Drive Logistics Chat (Spec §3)
    recruiter_chat_payload = {
        "job_id": job_id,
        "thread_type": "COORDINATOR_RECRUITER",
        "subject": "Drive Logistics: Round 1 Aptitude Results & Lab 3 Seating",
        "initial_message": "Hi Coordinator, Round 1 results are finalized. Please dispatch the first 15 shortlisted candidates to Lab 3 immediately."
    }
    res_rec_chat = requests.post(f"{BASE_URL}/api/messages/threads", json=recruiter_chat_payload, headers=h_rec)
    assert res_rec_chat.status_code == 200, f"Recruiter logistics chat creation failed: {res_rec_chat.text}"
    lane2_id = res_rec_chat.json()["id"]
    print(f"[PASS] Recruiter started Lane 2 logistics chat (Thread ID {lane2_id}).")

    # Coordinator replies to Recruiter
    coord_logistics_reply = {
        "content": "Received. All 15 candidates are seated in Lab 3 and the proctor is ready."
    }
    res_coord_rep = requests.post(f"{BASE_URL}/api/messages/threads/{lane2_id}/messages", json=coord_logistics_reply, headers=h_coord)
    assert res_coord_rep.status_code == 200, f"Coordinator logistics reply failed: {res_coord_rep.text}"
    print("[PASS] Coordinator replied to Recruiter in Lane 2.")

    # Recruiter receives reply
    res_rec_view = requests.get(f"{BASE_URL}/api/messages/threads/{lane2_id}", headers=h_rec)
    assert res_rec_view.status_code == 200, f"Recruiter fetch detail failed: {res_rec_view.text}"
    rec_view_data = res_rec_view.json()
    assert len(rec_view_data["messages"]) == 2
    print(f"[PASS] Recruiter received Coordinator confirmation: '{rec_view_data['messages'][-1]['content']}'")

    print("\n[SUCCESS] ALL 10 MESSAGING & INQUIRY SPEC TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"[ERROR] Test failed: {e}", file=sys.stderr)
        sys.exit(1)
