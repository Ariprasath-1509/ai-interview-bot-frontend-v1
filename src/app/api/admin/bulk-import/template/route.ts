import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Define headers - exact order as backend expects (Column A to Q)
    // * = Required field
    const headers = [
      'No',                           // Column A - Row number (auto-filled)
      'Batch (DOH) *',               // Column B - Required
      'Batch Mentor',                // Column C - Optional
      'Source *',                    // Column D - Required (B2B/BENCH/MARKET)
      'Status',                      // Column E - Optional (RFD/WFD/DOB/DEPLOYED)
      'Rating',                      // Column F - Optional (ASSET/MEDIUM/LIABILITY)
      'Name *',                      // Column G - Required
      'Contact Number',              // Column H - Optional
      'Official Mail ID *',          // Column I - Required (at least one email required)
      'Personal Mail ID *',          // Column J - Required (at least one email required)
      'YOE - A',                     // Column K - Optional (Actual experience)
      'YOE - P',                     // Column L - Optional (Portrayed experience)
      'Skill Set *',                 // Column M - Required (JAVA_SB/JFSR/REACT_JS)
      'YOP',                         // Column N - Optional (Year of Passing)
      'No of Interviews',            // Column O - Optional
      'Interview Mentor Name',       // Column P - Optional
      'Client Name'                  // Column Q - Optional
    ];

    // Sample data rows with all columns
    const sampleData = [
      [1, 'Batch-2024-Q1', 'Mentor A', 'B2B', 'RFD', 'ASSET', 'John Doe', '9876543210', 'john@company.com', 'john@gmail.com', 5.5, 6.0, 'JAVA_SB', 2019, 2, 'Interview Mentor 1', 'TechCorp'],
      [2, 'Batch-2024-Q1', 'Mentor B', 'BENCH', 'RFD', 'MEDIUM', 'Jane Smith', '9876543211', 'jane@company.com', 'jane@gmail.com', 3.0, 4.0, 'REACT_JS', 2021, 1, 'Interview Mentor 2', 'StartupXYZ'],
      [3, 'Batch-2024-Q2', 'Mentor A', 'MARKET', 'WFD', 'ASSET', 'Mike Johnson', '9876543212', 'mike@company.com', 'mike@gmail.com', 7.0, 8.0, 'JFSR', 2017, 0, '', ''],
    ];

    // Combine headers and data
    const wsData = [headers, ...sampleData];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // No
      { wch: 18 }, // Batch (DOH) *
      { wch: 15 }, // Batch Mentor
      { wch: 12 }, // Source *
      { wch: 10 }, // Status
      { wch: 10 }, // Rating
      { wch: 20 }, // Name *
      { wch: 15 }, // Contact Number
      { wch: 25 }, // Official Mail ID *
      { wch: 25 }, // Personal Mail ID *
      { wch: 10 }, // YOE - A
      { wch: 10 }, // YOE - P
      { wch: 15 }, // Skill Set *
      { wch: 10 }, // YOP
      { wch: 15 }, // No of Interviews
      { wch: 20 }, // Interview Mentor Name
      { wch: 15 }, // Client Name
    ];

    // Add worksheet to workbook with exact sheet name backend expects
    XLSX.utils.book_append_sheet(wb, ws, 'Candidate');

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return response
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Candidate_Bulk_Import_Template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Template download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}