'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Upload, Sparkles, FileText, User, Briefcase } from 'lucide-react';
import { ResumeUploadWidget } from '@/components/resume/ResumeUploadWidget';
import { AutoFillIndicator } from '@/components/resume/AutoFillIndicator';

interface TestStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
}

export default function TestFlowPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [testData, setTestData] = useState({
    candidateId: '5defdcb2-560b-49ed-9276-bba89f2e4b8e', // Real candidate ID
    resumeUploaded: false,
    summaryGenerated: false,
    autoFillApplied: false,
    formData: {
      engineerEmail: 'ariprasath6767@gmail.com',
      engineerName: 'Ariprasath',
      resumeSummary: '',
      jdTitle: '',
      focusAreas: ''
    }
  });

  const steps: TestStep[] = [
    {
      id: 'upload',
      title: 'Upload Resume',
      description: 'Upload a PDF, DOC, or DOCX resume file',
      completed: testData.resumeUploaded
    },
    {
      id: 'process',
      title: 'AI Processing',
      description: 'AI extracts text and generates summary',
      completed: testData.summaryGenerated
    },
    {
      id: 'autofill',
      title: 'Auto-fill Form',
      description: 'Use resume summary to populate interview form',
      completed: testData.autoFillApplied,
      action: () => handleAutoFill()
    },
    {
      id: 'edit',
      title: 'Manual Editing',
      description: 'Edit auto-filled fields as needed',
      completed: false
    },
    {
      id: 'submit',
      title: 'Create Interview',
      description: 'Submit the completed form',
      completed: false
    }
  ];

  const handleResumeGenerated = (summary: string) => {
    setTestData(prev => ({
      ...prev,
      resumeUploaded: true,
      summaryGenerated: true,
      formData: {
        ...prev.formData,
        resumeSummary: summary
      }
    }));
    setCurrentStep(2);
  };

  const handleAutoFill = () => {
    // Simulate auto-fill with mock data
    setTestData(prev => ({
      ...prev,
      autoFillApplied: true,
      formData: {
        ...prev.formData,
        engineerEmail: 'john.doe@example.com',
        engineerName: 'John Doe',
        jdTitle: 'Senior Java Developer',
        focusAreas: 'Java, Spring Boot, Microservices'
      }
    }));
    setCurrentStep(3);
  };

  const handleFieldEdit = (field: string, value: string) => {
    setTestData(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value
      }
    }));
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Resume Upload & Auto-fill Test Flow</h1>
        <p className="text-zinc-600">Test the complete user journey from resume upload to interview creation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Progress Steps */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Test Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.completed 
                        ? 'bg-green-100 text-green-800 border-2 border-green-300'
                        : index === currentStep
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                        : 'bg-zinc-100 text-zinc-500 border-2 border-zinc-200'
                    }`}>
                      {step.completed ? '✓' : index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        step.completed ? 'text-green-800' : index === currentStep ? 'text-blue-800' : 'text-zinc-600'
                      }`}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-zinc-500 mt-1">{step.description}</p>
                      
                      {step.action && !step.completed && index <= currentStep && (
                        <Button
                          size="sm"
                          onClick={step.action}
                          className="mt-2"
                        >
                          {step.title}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Test Data Display */}
          <Card>
            <CardHeader>
              <CardTitle>Current Test Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Resume Uploaded:</span>
                  <Badge variant={testData.resumeUploaded ? 'default' : 'secondary'}>
                    {testData.resumeUploaded ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Summary Generated:</span>
                  <Badge variant={testData.summaryGenerated ? 'default' : 'secondary'}>
                    {testData.summaryGenerated ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Auto-fill Applied:</span>
                  <Badge variant={testData.autoFillApplied ? 'default' : 'secondary'}>
                    {testData.autoFillApplied ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Interactive Components */}
        <div className="space-y-6">
          {/* Step 1 & 2: Resume Upload */}
          {currentStep <= 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Step 1-2: Resume Upload & Processing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-zinc-100 rounded text-sm">
                  <strong>Debug Info:</strong><br/>
                  Candidate ID: {testData.candidateId}<br/>
                  Resume Uploaded: {testData.resumeUploaded ? 'Yes' : 'No'}<br/>
                  Summary Generated: {testData.summaryGenerated ? 'Yes' : 'No'}
                </div>
                <ResumeUploadWidget
                  candidateId={testData.candidateId}
                  onSummaryGenerated={handleResumeGenerated}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Auto-fill Indicator */}
          {testData.autoFillApplied && (
            <AutoFillIndicator
              isActive={true}
              fieldsPopulated={['engineerEmail', 'engineerName', 'jdTitle', 'focusAreas', 'resumeSummary']}
              confidence="high"
              onRevert={() => {
                setTestData(prev => ({
                  ...prev,
                  autoFillApplied: false,
                  formData: {
                    ...prev.formData,
                    engineerEmail: '',
                    engineerName: '',
                    jdTitle: '',
                    focusAreas: ''
                  }
                }));
                setCurrentStep(2);
              }}
            />
          )}

          {/* Step 4: Mock Interview Form */}
          {currentStep >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Step 4: Interview Form (Mock)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Engineer Email</label>
                  <input
                    type="email"
                    value={testData.formData.engineerEmail}
                    onChange={(e) => handleFieldEdit('engineerEmail', e.target.value)}
                    className={`w-full p-2 border rounded-md ${
                      testData.autoFillApplied && testData.formData.engineerEmail
                        ? 'border-blue-300 bg-blue-50/50'
                        : 'border-zinc-300'
                    }`}
                    placeholder="candidate@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Engineer Name</label>
                  <input
                    type="text"
                    value={testData.formData.engineerName}
                    onChange={(e) => handleFieldEdit('engineerName', e.target.value)}
                    className={`w-full p-2 border rounded-md ${
                      testData.autoFillApplied && testData.formData.engineerName
                        ? 'border-blue-300 bg-blue-50/50'
                        : 'border-zinc-300'
                    }`}
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Job Title</label>
                  <input
                    type="text"
                    value={testData.formData.jdTitle}
                    onChange={(e) => handleFieldEdit('jdTitle', e.target.value)}
                    className={`w-full p-2 border rounded-md ${
                      testData.autoFillApplied && testData.formData.jdTitle
                        ? 'border-blue-300 bg-blue-50/50'
                        : 'border-zinc-300'
                    }`}
                    placeholder="Senior Java Developer"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Resume Summary</label>
                  <textarea
                    value={testData.formData.resumeSummary}
                    onChange={(e) => handleFieldEdit('resumeSummary', e.target.value)}
                    className={`w-full p-2 border rounded-md h-24 ${
                      testData.summaryGenerated
                        ? 'border-blue-300 bg-blue-50/50'
                        : 'border-zinc-300'
                    }`}
                    placeholder="AI-generated resume summary will appear here..."
                  />
                </div>
                
                <Button 
                  className="w-full"
                  disabled={!testData.formData.resumeSummary}
                >
                  Create Interview (Mock)
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}