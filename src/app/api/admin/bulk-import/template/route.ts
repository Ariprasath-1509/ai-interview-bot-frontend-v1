import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Sample Excel template data
    const templateData = [
      ['Batch', 'Source', 'Status', 'Rating', 'Name', 'Contact Number', 'Official Mail ID', 'Personal Mail ID', 'YOE - A', 'YOE - P', 'Skill Set', 'No of Interviews', 'YOP'],
      ['Batch-2024-Q1', 'B2B', 'RFD', 'ASSET', 'John Doe', '9876543210', 'john@company.com', 'john@gmail.com', '5.5', '6.0', 'JAVA_SB', '2', '2019'],
      ['Batch-2024-Q1', 'BENCH', 'NOT_RFD', 'MEDIUM', 'Jane Smith', '9876543211', 'jane@company.com', 'jane@gmail.com', '3.0', '4.0', 'REACT_JS', '1', '2021'],
      ['Batch-2024-Q2', 'B2B', 'RFD', 'ASSET', 'Mike Johnson', '9876543212', 'mike@company.com', 'mike@gmail.com', '7.0', '8.0', 'JFSR', '0', '2017'],
    ];

    // Convert to CSV format (Excel will open CSV files)
    const csvContent = templateData
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="bulk_import_template.csv"',
      },
    });

    return response;
  } catch (error) {
    console.error('Template download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}