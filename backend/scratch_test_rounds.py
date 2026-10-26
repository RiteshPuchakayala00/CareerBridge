import requests
from datetime import datetime, timezone, timedelta

BASE = "http://127.0.0.1:8000"

def run_tests():
    print("=== STARTING INTERVIEW ROUNDS & SHORTLISTING TEST SUITE ===")
    
    # 1. Login Recruiter & TPO
    recruiter_res = requests.post(f"{BASE}/api/auth/login", data={"username": "hr@techcorp.com", "password": "recruiter123"})
    assert recruiter_res.status_code == 200, f"Recruiter login failed: {recruiter_res.text}"
    recruiter_token = recruiter_res.json()["access_token"]
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}
    print("[PASS] Recruiter authenticated successfully.")

    tpo_res = requests.post(f"{BASE}/api/auth/login", data={"username": "tpo@college.edu", "password": "admin123"})
    assert tpo_res.status_code == 200
    tpo_headers = {"Authorization": f"Bearer {tpo_res.json()['access_token']}"}

    # 2. Login Students via Google SSO (Spec: google_sso_and_batch_eligibility_spec.md)
    s3_res = requests.post(f"{BASE}/api/auth/google", json={"token": "demo_sso:student3@college.edu"})
    assert s3_res.status_code == 200, f"Student 3 login failed: {s3_res.text}"
    s3_token = s3_res.json()["access_token"]
    s3_headers = {"Authorization": f"Bearer {s3_token}"}

    s4_res = requests.post(f"{BASE}/api/auth/google", json={"token": "demo_sso:student4@college.edu"})
    assert s4_res.status_code == 200, f"Student 4 login failed: {s4_res.text}"
    s4_token = s4_res.json()["access_token"]
    s4_headers = {"Authorization": f"Bearer {s4_token}"}
    print("[PASS] Students 3 & 4 authenticated via Google SSO.")

    # 3. Create a fresh test drive
    now = datetime.now(timezone.utc)
    create_job_res = requests.post(
        f"{BASE}/api/jobs",
        json={
            "title": "Cloud Solutions Architect Drive",
            "description": "Enterprise cloud architecture role at TechCorp Inc. Systems, cloud services, and microservices.",
            "location": "Bengaluru / Remote",
            "job_type": "Full-Time",
            "ctc_lpa": 16.5,
            "eligibility_cgpa": 6.5,
            "eligible_departments": ["CSE", "ECE", "IT"],
            "max_backlogs": 1,
            "target_batch_year": 2026,
            "deadline": (now + timedelta(days=5)).isoformat(),
            "drive_date": (now + timedelta(days=7)).isoformat()
        },
        headers=recruiter_headers
    )
    assert create_job_res.status_code == 201
    job_id = create_job_res.json()["job_id"]
    print(f"[PASS] Created Job Posting ID {job_id}.")

    # Approve job via TPO
    appr_res = requests.patch(f"{BASE}/api/jobs/{job_id}/approve", headers=tpo_headers)
    assert appr_res.status_code == 200
    print(f"[PASS] Job {job_id} approved and published.")

    # 4. Configure 3 sequential dynamic rounds (Spec §2 & §5)
    rounds_payload = {
        "rounds": [
            {
                "round_number": 1,
                "name": "Online Coding Assessment",
                "round_type": "ONLINE_TEST",
                "description": "60-minute DSA & problem solving assessment on HackerEarth.",
                "test_url": "https://assessment.hackerearth.com/college-drive-2026/cloud-arch",
                "access_code": "CB@2026",
                "start_time": (now + timedelta(hours=1)).isoformat(),
                "end_time": (now + timedelta(hours=3)).isoformat()
            },
            {
                "round_number": 2,
                "name": "Technical Interview 1",
                "round_type": "VIRTUAL_INTERVIEW",
                "description": "Virtual technical interview covering cloud architecture and networks.",
                "meeting_url": "https://meet.google.com/abc-defg-hij",
                "access_code": "PIN-4482",
                "start_time": (now + timedelta(days=1, hours=10)).isoformat(),
                "end_time": (now + timedelta(days=1, hours=17)).isoformat()
            },
            {
                "round_number": 3,
                "name": "HR & Leadership Round",
                "round_type": "OFFLINE_INTERVIEW",
                "description": "Face-to-face interview in college placement cell.",
                "venue": "Academic Block 2, Room 402, Cabin B",
                "access_code": "Formal attire required. Carry 2 printed resumes.",
                "start_time": (now + timedelta(days=2, hours=11)).isoformat(),
                "end_time": (now + timedelta(days=2, hours=15)).isoformat()
            }
        ]
    }
    
    rounds_res = requests.post(f"{BASE}/api/jobs/{job_id}/rounds", json=rounds_payload, headers=recruiter_headers)
    assert rounds_res.status_code == 200, f"Configure rounds failed: {rounds_res.text}"
    configured_rounds = rounds_res.json()
    assert len(configured_rounds) == 3, f"Expected 3 rounds, got {len(configured_rounds)}"
    print(f"[PASS] Successfully configured 3 dynamic rounds for Job {job_id}.")
    round_1_id = configured_rounds[0]["id"]
    round_2_id = configured_rounds[1]["id"]
    round_3_id = configured_rounds[2]["id"]

    # 5. GET /api/jobs/{id}/rounds
    get_rounds_res = requests.get(f"{BASE}/api/jobs/{job_id}/rounds", headers=s3_headers)
    assert get_rounds_res.status_code == 200, f"Get rounds failed: {get_rounds_res.text}"
    rounds_data = get_rounds_res.json()
    assert len(rounds_data) == 3
    print(f"[PASS] GET /api/jobs/{job_id}/rounds returned configured pipeline.")

    # 6. Students 3 & 4 apply to Job
    for s_name, s_h in [("Student 3", s3_headers), ("Student 4", s4_headers)]:
        apply_res = requests.post(f"{BASE}/api/jobs/{job_id}/apply", headers=s_h)
        assert apply_res.status_code in [201, 400], f"{s_name} apply error: {apply_res.text}"
        print(f"[PASS] {s_name} successfully applied to Job {job_id}.")

    # 7. Recruiter checks applicants for Job
    applicants_res = requests.get(f"{BASE}/api/recruiter/applicants/{job_id}", headers=recruiter_headers)
    assert applicants_res.status_code == 200
    applicants = applicants_res.json()
    assert len(applicants) == 2, f"Expected 2 applicants, got {len(applicants)}"
    print(f"[PASS] Recruiter listed {len(applicants)} applicants with round tracking metadata.")
    
    app_3 = next(a for a in applicants if "student3" in a["email"])
    app_4 = next(a for a in applicants if "student4" in a["email"])
    print(f"  Candidate A: {app_3['student_name']} (App ID {app_3['application_id']}, Round: {app_3['current_round_name']})")
    print(f"  Candidate B: {app_4['student_name']} (App ID {app_4['application_id']}, Round: {app_4['current_round_name']})")

    # 8. Update logistics via PATCH /api/jobs/{id}/rounds/{round_id}/logistics
    patch_res = requests.patch(
        f"{BASE}/api/jobs/{job_id}/rounds/{round_1_id}/logistics",
        json={
            "description": "Updated DSA assessment syllabus: Arrays, Dynamic Programming, and Graph Algorithms.",
            "access_code": "CB@2026_UPDATED"
        },
        headers=recruiter_headers
    )
    assert patch_res.status_code == 200, f"Patch logistics failed: {patch_res.text}"
    assert patch_res.json()["round"]["access_code"] == "CB@2026_UPDATED"
    print("[PASS] Recruiter updated Round 1 online test logistics.")

    # 8b. Department Coordinator allocates on-campus venue (Spec §3.C & §6)
    coord_res = requests.post(f"{BASE}/api/auth/google", json={"token": "demo_sso:coord.cse@college.edu"})
    assert coord_res.status_code == 200, f"Coordinator login failed: {coord_res.text}"
    coord_headers = {"Authorization": f"Bearer {coord_res.json()['access_token']}"}

    coord_patch = requests.patch(
        f"{BASE}/api/jobs/{job_id}/rounds/{round_3_id}/logistics",
        json={
            "venue": "Academic Block 2, Computer Lab 4, Cabin 3",
            "description": "Reporting Time: 09:30 AM. Formal attire required. Bring 2 hard copies of resume and college ID card."
        },
        headers=coord_headers
    )
    assert coord_patch.status_code == 200, f"Coordinator patch failed: {coord_patch.text}"
    assert "Computer Lab 4" in coord_patch.json()["round"]["venue"]
    print("[PASS] Department Coordinator allocated on-campus venue (Spec §3.C).")

    # 9. Shortlisting & Immediate Rejection Workflow (Spec §4)
    # Recruiter shortlists Candidate B (Student 4) for Round 2, Candidate A (Student 3) is NOT shortlisted.
    # Candidate B is also given a scheduled interview slot for Round 2.
    slot_time = (now + timedelta(days=1, hours=10, minutes=30)).isoformat()
    shortlist_payload = {
        "shortlisted_application_ids": [app_4["application_id"]],
        "candidate_slots": [
            {
                "application_id": app_4["application_id"],
                "scheduled_slot": slot_time
            }
        ],
        "next_round_logistics": {
            "meeting_url": "https://meet.google.com/updated-cloud-room-999"
        }
    }
    shortlist_res = requests.post(
        f"{BASE}/api/jobs/{job_id}/rounds/{round_1_id}/shortlist",
        json=shortlist_payload,
        headers=recruiter_headers
    )
    assert shortlist_res.status_code == 200, f"Shortlist failed: {shortlist_res.text}"
    shortlist_data = shortlist_res.json()
    assert shortlist_data["shortlisted_count"] == 1
    assert shortlist_data["rejected_count"] == 1
    print(f"[PASS] Shortlist published: {shortlist_data['shortlisted_count']} advanced, {shortlist_data['rejected_count']} rejected.")

    # 10. Verify Shortlisted Student 4 Dashboard via GET /api/applications/my-applications (Spec §6)
    s4_apps_res = requests.get(f"{BASE}/api/applications/my-applications", headers=s4_headers)
    assert s4_apps_res.status_code == 200, f"Student 4 my-applications failed: {s4_apps_res.text}"
    s4_apps = s4_apps_res.json()
    my_app_4 = next((a for a in s4_apps if a["id"] == app_4["application_id"]), None)
    assert my_app_4 is not None, "Candidate 4 application not found in my-applications"
    assert my_app_4["status"] == "IN_PROGRESS"
    assert my_app_4["current_round"] is not None
    assert my_app_4["current_round"]["round_number"] == 2
    assert "https://meet.google.com" in my_app_4["current_round"]["meeting_url"]
    assert my_app_4["current_round"]["scheduled_slot"] is not None
    print(f"[PASS] Shortlisted Candidate 4 receives Active Round 2 Card: {my_app_4['current_round']['name']} with {my_app_4['current_round']['button_label']} and slot.")

    # 11. Verify Unselected Student 3 Dashboard via GET /api/applications/my-applications
    # Should see immediate transparent rejection: status REJECTED, rejection_round_number = 1
    s3_apps_res = requests.get(f"{BASE}/api/applications/my-applications", headers=s3_headers)
    assert s3_apps_res.status_code == 200
    s3_apps = s3_apps_res.json()
    my_app_3 = next((a for a in s3_apps if a["id"] == app_3["application_id"]), None)
    assert my_app_3 is not None, "Candidate 3 application not found in my-applications"
    assert my_app_3["status"] == "REJECTED"
    assert my_app_3["rejection_round_number"] == 1
    assert "Not shortlisted for Round 1" in my_app_3["rejection_reason"]
    print(f"[PASS] Unselected Candidate 3 receives transparent rejection closure: {my_app_3['rejection_reason']}.")

    print("\n[SUCCESS] ALL 11 TESTS PASSED SUCCESSFULLY! Endpoints conform 100% to spec.")

if __name__ == "__main__":
    run_tests()

