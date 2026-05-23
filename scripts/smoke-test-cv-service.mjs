const baseUrl = process.argv[2] ?? "https://solvahr.co.ke";

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({ error: "request_failed" }));
  if (!response.ok) {
    throw new Error(`${path}: ${payload.error ?? response.status}`);
  }
  return payload;
}

const create = await request("/api/public/cv-service/orders", {
  method: "POST",
  body: JSON.stringify({ packageKey: "entry" }),
});

const order = create.order;
const token = order.publicToken;

await request(`/api/public/cv-service/orders/${order.id}`, {
  method: "PATCH",
  body: JSON.stringify({
    token,
    packageKey: "entry",
    customerName: "Test Candidate",
    phone: "0712345678",
    email: "test@example.com",
    location: "Nairobi",
    linkedinUrl: "",
    portfolioUrl: "",
    targetRole: "HR Officer",
    industry: "Human Resources",
    countryRegion: "Kenya",
    preferredCvStyle: "ATS-compliant premium",
    jobDescription: "Support HR operations",
    currentProfession: "HR Assistant",
    yearsOfExperience: 2,
    careerObjective: "Grow into an HR Officer role",
    majorAchievements: "Improved filing accuracy and onboarding follow-up",
    preferredTone: "Professional and confident",
    educationEntries: [{ institution: "UON", qualification: "BCom", year: "2024", grade: "Second Class" }],
    qualificationEntries: [{ name: "HR Basics", issuer: "IHRM", year: "2025", type: "Certification" }],
    experienceEntries: [
      {
        employer: "ABC Ltd",
        jobTitle: "HR Assistant",
        startDate: "2024-01",
        endDate: "2026-04",
        currentRole: false,
        duties: "Maintained staff files",
        achievements: "Reduced document turnaround by 20%",
        tools: "Excel, HRIS",
        leadership: "Guided interns",
      },
    ],
    skillEntries: [{ category: "Technical skills", items: "Recruitment, onboarding, Excel" }],
    refereeEntries: [
      {
        name: "Ref One",
        designation: "Manager",
        organization: "ABC",
        phone: "0700000001",
        email: "ref1@example.com",
        relationship: "Supervisor",
      },
      {
        name: "Ref Two",
        designation: "HR Lead",
        organization: "DEF",
        phone: "0700000002",
        email: "ref2@example.com",
        relationship: "Mentor",
      },
      {
        name: "Ref Three",
        designation: "Director",
        organization: "GHI",
        phone: "0700000003",
        email: "ref3@example.com",
        relationship: "Lecturer",
      },
    ],
    existingCvText: "",
    existingCvPaste: "",
    specialInstructions: "Make it ATS compliant",
    uploadedCvPath: "",
    uploadedCvName: "",
    uploadedCvMime: "",
    uploadedCvSize: 0,
  }),
});

const paid = await request(`/api/public/cv-service/orders/${order.id}/payment-test`, {
  method: "POST",
  body: JSON.stringify({ token }),
});

const generated = await request(`/api/public/cv-service/orders/${order.id}/generate`, {
  method: "POST",
  body: JSON.stringify({ token }),
});

console.log(JSON.stringify({
  orderId: order.id,
  paymentStatus: paid.order.paymentStatus,
  generationStatus: generated.order.generationStatus,
  docx: generated.order.generatedDownloadLinks.docx,
  pdf: generated.order.generatedDownloadLinks.pdf,
}, null, 2));
