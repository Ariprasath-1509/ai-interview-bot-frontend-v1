import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Define headers
    const headers = [
      'Batch',
      'Source',
      'Status',
      'Rating',
      'Name',
      'Contact Number',
      'Official Mail ID',
      'Personal Mail ID',
      'YOE - A',
      'YOE - P',
      'Skill Set',
      'No of Interviews',
      'YOP'
    ];

    // Sample data rows
    const sampleData = [
      ['Batch-2024-Q1', 'B2B', 'RFD', 'ASSET', 'John Doe', '9876543210', 'john@company.com', 'john@gmail.com', 5.5, 6.0, 'JAVA_SB', 2, 2019],
      ['Batch-2024-Q1', 'BENCH', 'RFD', 'MEDIUM', 'Jane Smith', '9876543211', 'jane@company.com', 'jane@gmail.com', 3.0, 4.0, 'REACT_JS', 1, 2021],
      ['Batch-2024-Q2', 'B2B', 'RFD', 'ASSET', 'Mike Johnson', '9876543212', 'mike@company.com', 'mike@gmail.com', 7.0, 8.0, 'JFSR', 0, 2017],
    ];

    // Combine headers and data
    const wsData = [headers, ...sampleData];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Batch
      { wch: 10 }, // Source
      { wch: 10 }, // Status
      { wch: 10 }, // Rating
      { wch: 20 }, // Name
      { wch: 15 }, // Contact Number
      { wch: 25 }, // Official Mail ID
      { wch: 25 }, // Personal Mail ID
      { wch: 10 }, // YOE - A
      { wch: 10 }, // YOE - P
      { wch: 12 }, // Skill Set
      { wch: 15 }, // No of Interviews
      { wch: 10 }, // YOP
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates');

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