import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    console.log('Session:', { role: session?.role, userId: session?.userId, hasToken: !!session?.token });
    
    if (!session || session.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestFormData = await req.formData();
    const file = requestFormData.get("resume") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only PDF, DOC, and DOCX are allowed." }, { status: 400 });
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 });
    }

    // For now, we'll integrate with the backend resume service
    // The backend will handle file storage, text extraction, and AI summarization
    
    const backendFormData = new FormData();
    backendFormData.append('resume', file);
    
    // Call backend resume upload endpoint through API Gateway
    console.log('Calling backend with headers:', {
      userId: session.userId,
      role: session.role,
      hasToken: !!session.token
    });
    
    const response = await fetch('http://localhost:6002/resumes/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'X-User-Id': session.userId || '',
        'X-User-Role': session.role,
      },
      body: backendFormData,
    });
    
    const result = await response.json().catch(() => ({ error: 'Invalid response from server' }));
    
    if (!response.ok) {
      console.error('Backend error:', response.status, result);
      return NextResponse.json({ error: result.error || 'Upload failed' }, { status: response.status });
    }

    return NextResponse.json({ 
      success: true, 
      message: result.message || "Resume uploaded successfully",
      filename: result.filename || file.name,
      size: result.size || file.size,
      textExtracted: result.textExtracted || false,
      summary: result.summary || "Resume processed successfully"
    });

  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}