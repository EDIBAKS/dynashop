<template>
  <div class="row q-gutter-xs q-mb-sm items-center no-wrap">
    <q-btn
      color="primary"
      icon="download"
      label="Excel"
      flat
      dense
      style="min-width: 90px"
      @click="exportToExcel"
    />
    <q-btn
      color="red"
      icon="picture_as_pdf"
      label="PDF"
      flat
      dense
      style="min-width: 90px"
      @click="exportToPDF"
    />
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import jsPDF from 'jspdf'

import autoTable from 'jspdf-autotable'
import { useAuth } from 'src/stores/auth'
const auth = useAuth()

const getFirstDayOfMonth = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}
const getLastDayOfMonth = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
}

const form = reactive({
  startDate: localStorage.getItem('reportStartDate') || getFirstDayOfMonth(),
  endDate: localStorage.getItem('reportEndDate') || getLastDayOfMonth(),
  dpccode: localStorage.getItem('reportDpccode') || '',
  shopName: '',
})

const props = defineProps({
  reportType: { type: String, required: true },
  reportData: { type: Array, required: true },
  extraInfo: { type: Object, default: () => ({}) },
})

// ----------------- Excel Export -----------------
// ----------------- Excel Export -----------------
const exportToExcel = () => {
  if (!props.reportData || props.reportData.length === 0) return

  const wb = XLSX.utils.book_new() // create workbook
  const marginInfo = [
    ['DYNAPHARM'],
    [props.reportType.toUpperCase()],
    [`Period: ${form.startDate} - ${form.endDate}`],
    [`DPC: ${form.dpccode || ''}`],
    [],
  ]

  // --- DAILY SALES / PERSONAL BV / PERSONAL SALES ---
  if (['dailySales', 'personalBV', 'personalSales'].includes(props.reportType)) {
    const distributors = [...new Set(props.reportData.map((r) => r.distributoridno))]

    distributors.forEach((distId) => {
      const distReceipts = props.reportData.filter((r) => r.distributoridno === distId)
      const distName = distReceipts[0]?.distributorname || ''

      const sheetData = [...marginInfo, [`Distributor ID: ${distId}`, `Name: ${distName}`], []]

      let grandAmount = 0
      let grandBV = 0

      distReceipts.forEach((receipt) => {
        const formattedDate = dayjs(receipt.salesdate).format('MMM D, YYYY')
        sheetData.push([
          `Receipt No: ${receipt.receiptno}`,
          `Date: ${formattedDate}`,
          `Status: ${receipt.status}`,
        ])

        const items = receipt.salesdetails || []
        if (items.length > 0) {
          sheetData.push(['Product Code', 'Product Name', 'Price', 'Qty', 'BV', 'Total'])
          items.forEach((i) => {
            const total = (i.unitprice || 0) * (i.quantity || 0)
            sheetData.push([
              i.productcode || 'N/A',
              i.productname || 'N/A',
              i.unitprice || 0,
              i.quantity || 0,
              i.unitbv || 0,
              total.toFixed(2),
            ])
            grandAmount += total
            grandBV += i.unitbv || 0
          })
          sheetData.push([])
        }
      })

      // Grand totals
      sheetData.push([])
      sheetData.push([
        'Grand Total Amount',
        grandAmount.toFixed(2),
        'Grand Total BV',
        grandBV.toFixed(2),
      ])
      sheetData.push([
        'Printed by',
        auth.userDetails.firstname || 'System User',
        'Date',
        new Date().toLocaleString(),
      ])

      const ws = XLSX.utils.aoa_to_sheet(sheetData)

      // Auto column widths
      const maxWidths = []
      sheetData.forEach((row) => {
        row.forEach((cell, i) => {
          const length = cell ? cell.toString().length : 10
          maxWidths[i] = Math.max(maxWidths[i] || 10, length)
        })
      })
      ws['!cols'] = maxWidths.map((w) => ({ wch: w + 2 }))

      XLSX.utils.book_append_sheet(wb, ws, distName ? distName.substring(0, 25) : distId)
    })
  }

  // --- TALLYS ---
  else if (props.reportType === 'tallys') {
    const tallyType = props.extraInfo?.tallyType || 'daily'
    const tallies = props.reportData

    const sheetData = [...marginInfo, [`Tally Type: ${tallyType.toUpperCase()}`], []]
    let grandAmount = 0
    let grandBV = 0

    if (tallyType === 'daily') {
      tallies.forEach((day) => {
        const formattedDate = dayjs(day.date).format('MMM D, YYYY')
        sheetData.push([`Date: ${formattedDate}`])
        sheetData.push(['Product Code', 'Product Name', 'Qty', 'Price', 'BV', 'Amount'])

        day.items.forEach((i) => {
          const total = (i.unitprice || 0) * (i.quantity || 0)
          const bv = (i.bvs || 0) * (i.quantity || 0)
          sheetData.push([
            i.productcode || 'N/A',
            i.productname || 'N/A',
            i.quantity || 0,
            (i.unitprice || 0).toFixed(2),
            bv.toFixed(2),
            total.toFixed(2),
          ])
          grandAmount += total
          grandBV += bv
        })
        sheetData.push([])
      })
    }

    if (tallyType === 'monthly') {
      tallies.forEach((month) => {
        sheetData.push([`Month: ${month.month}`])
        sheetData.push(['Product Code', 'Product Name', 'BV', 'Price', 'Qty', 'Amount'])

        month.items.forEach((i) => {
          const total = (i.unitprice || 0) * (i.quantity || 0)
          const bv = (i.bvs || 0) * (i.quantity || 0)
          sheetData.push([
            i.productcode || 'N/A',
            i.productname || 'N/A',
            bv.toFixed(2),
            (i.unitprice || 0).toFixed(2),
            i.quantity || 0,
            total.toFixed(2),
          ])
          grandAmount += total
          grandBV += bv
        })
        sheetData.push([])
      })
    }

    // Grand totals
    sheetData.push([])
    sheetData.push([
      'Grand Total Amount',
      grandAmount.toFixed(2),
      'Grand Total BV',
      grandBV.toFixed(2),
    ])
    sheetData.push([
      'Printed by',
      auth.userDetails.firstname || 'System User',
      'Date',
      new Date().toLocaleString(),
    ])

    const ws = XLSX.utils.aoa_to_sheet(sheetData)
    const maxWidths = []
    sheetData.forEach((row) =>
      row.forEach(
        (cell, i) => (maxWidths[i] = Math.max(maxWidths[i] || 10, (cell || '').toString().length)),
      ),
    )
    ws['!cols'] = maxWidths.map((w) => ({ wch: w + 2 }))
    XLSX.utils.book_append_sheet(wb, ws, `Tallys`)
  }

  // --- SALES ---
  else if (props.reportType === 'sales') {
    const sales = props.reportData
    const sheetData = [...marginInfo, ['Date', 'Total Sales']]
    let grandAmount = 0

    sales.forEach((s) => {
      const total = s.total || 0
      sheetData.push([dayjs(s.date).format('MMM D, YYYY'), total.toFixed(2)])
      grandAmount += total
    })

    sheetData.push([])
    sheetData.push(['Grand Total', grandAmount.toFixed(2)])
    sheetData.push([
      'Printed by',
      auth.userDetails.firstname || 'System User',
      'Date',
      new Date().toLocaleString(),
    ])

    const ws = XLSX.utils.aoa_to_sheet(sheetData)
    const maxWidths = []
    sheetData.forEach((row) =>
      row.forEach(
        (cell, i) => (maxWidths[i] = Math.max(maxWidths[i] || 10, (cell || '').toString().length)),
      ),
    )
    ws['!cols'] = maxWidths.map((w) => ({ wch: w + 2 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Sales')
  }

  // --- Save Excel File ---
  const fileName = `${props.reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, fileName)
}

// ----------------- PDF Export -----------------
// ----------------- PDF Export -----------------
const exportToPDF = () => {
  if (!props.reportData || props.reportData.length === 0) return

  const doc = new jsPDF()
  const pageHeight = doc.internal.pageSize.height
  const margin = 10
  let startY = 50
  const grandTotals = { amount: 0, bv: 0 }

  const addPageIfNeeded = (currentY) => {
    if (currentY > pageHeight - 30) {
      doc.addPage()
      return margin
    }
    return currentY
  }

  // --- Header ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(200, 0, 0) // red
  doc.text('DYNAPHARM', 105, 10, { align: 'center' })

  // 🟦 Report Type
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text(props.reportType.toUpperCase(), 105, 18, { align: 'center' })

  // 🟩 Period
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`Period: ${form.startDate} - ${form.endDate}`, margin, 28)
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 200)
  doc.text(`DPC: ${(form.dpccode || '').toUpperCase()}`, margin, 39)
  doc.setTextColor(0, 0, 0)

  // === EXISTING: dailySales, personalBV, personalSales ===
  if (['dailySales', 'personalBV', 'personalSales'].includes(props.reportType)) {
    props.reportData.forEach((groupOrReceipt) => {
      const receipts = groupOrReceipt.sales || [groupOrReceipt]
      const distributorInfo = groupOrReceipt.distributoridno ? groupOrReceipt : null

      receipts.forEach((receipt) => {
        const items = receipt.salesdetails || []

        // Distributor Info
        if (distributorInfo) {
          doc.setFontSize(11)
          doc.text(`Distributor ID: ${distributorInfo.distributoridno || ''}`, margin, startY)
          startY += 6
          doc.text(`Name: ${distributorInfo.distributorname || ''}`, margin, startY)
          startY += 8
        }

        // Receipt Header
        const formattedDate = dayjs(receipt.salesdate).format('MMM D, YYYY')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.setTextColor(0, 0, 255)
        doc.text(`Receipt No: ${receipt.receiptno || ''}`, margin, startY)
        const textWidth = doc.getTextWidth(`Receipt No: ${receipt.receiptno || ''}`)
        doc.setTextColor(0, 0, 0)
        doc.text(
          ` | Date: ${formattedDate} | Status: ${receipt.status || ''}`,
          margin + textWidth,
          startY,
        )

        startY += 5

        if (items.length > 0) {
          autoTable(doc, {
            startY,
            head: [['Product Code', 'Product Name', 'Price', 'Qty', 'BV', 'Total']],
            body: items.map((i) => [
              i.productcode || 'N/A',
              i.productname || 'N/A',
              i.unitprice || 0,
              i.quantity || 0,
              i.unitbv || 0,
              ((i.unitprice || 0) * (i.quantity || 0)).toFixed(2),
            ]),
            styles: { fontSize: 9 },
            margin: { left: margin, right: margin },
          })

          const finalY = doc.lastAutoTable.finalY
          const receiptTotal = items.reduce(
            (tot, i) => {
              tot.amount += (i.unitprice || 0) * (i.quantity || 0)
              tot.bv += i.unitbv || 0
              return tot
            },
            { amount: 0, bv: 0 },
          )

          doc.text(`Receipt Total Amount: ${receiptTotal.amount.toFixed(2)}`, margin, finalY + 8)
          doc.text(`Receipt Total BV: ${receiptTotal.bv.toFixed(2)}`, margin, finalY + 16)

          grandTotals.amount += receiptTotal.amount
          grandTotals.bv += receiptTotal.bv

          startY = finalY + 24
        } else {
          startY += 15
        }

        doc.setDrawColor(200)
        doc.setLineWidth(0.4)
        doc.line(margin, startY, 200, startY)
        startY += 10
        startY = addPageIfNeeded(startY)
      })
    })
  }

  // === NEW: tallys (daily / monthly) ===
  else if (props.reportType === 'tallys') {
    const tallyType = props.extraInfo?.tallyType || 'daily'
    const tallies = props.reportData

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(`Tally Type: ${tallyType.toUpperCase()}`, margin, startY)
    startY += 10

    if (tallyType === 'daily') {
      tallies.forEach((day) => {
        const formattedDate = dayjs(day.date).format('MMM D, YYYY')
        doc.setFontSize(11)
        doc.text(`Date: ${formattedDate}`, margin, startY)
        startY += 4

        autoTable(doc, {
          startY,
          head: [['Product Code', 'Product Name', 'Qty', 'Price', 'BV', 'Amount']],
          body: day.items.map((i) => [
            i.productcode,
            i.productname,
            i.quantity,
            i.unitprice.toFixed(2),
            (i.bvs * i.quantity).toFixed(2),
            (i.unitprice * i.quantity).toFixed(2),
          ]),
          styles: { fontSize: 9 },
          margin: { left: margin, right: margin },
        })

        const finalY = doc.lastAutoTable.finalY
        const totalQty = day.items.reduce((sum, i) => sum + i.quantity, 0)
        const totalBV = day.items.reduce((sum, i) => sum + i.bvs * i.quantity, 0)
        const totalAmt = day.items.reduce((sum, i) => sum + i.unitprice * i.quantity, 0)

        doc.text(`Total Qty: ${totalQty}`, margin, finalY + 6)
        doc.text(`Total BV: ${totalBV.toFixed(2)}`, margin + 60, finalY + 6)
        doc.text(`Total Amount: ${totalAmt.toFixed(2)}`, margin + 120, finalY + 6)

        grandTotals.amount += totalAmt
        grandTotals.bv += totalBV

        startY = finalY + 14
        startY = addPageIfNeeded(startY)
      })
    }

    if (tallyType === 'monthly') {
      tallies.forEach((month) => {
        doc.setFontSize(11)
        doc.text(`Month: ${month.month}`, margin, startY)
        startY += 4

        autoTable(doc, {
          startY,
          head: [['Product Code', 'Product Name', 'BV', 'Price', 'Qty', 'Amount']],
          body: month.items.map((i) => [
            i.productcode,
            i.productname,
            ((i.bvs || 0) * (i.quantity || 0)).toFixed(2),
            (i.unitprice || 0).toFixed(2),
            i.quantity,
            ((i.unitprice || 0) * (i.quantity || 0)).toFixed(2),
          ]),
          styles: { fontSize: 9 },
          margin: { left: margin, right: margin },
        })

        const finalY = doc.lastAutoTable.finalY
        const totalBV = month.items.reduce((s, i) => s + i.bvs * i.quantity, 0)
        const totalAmt = month.items.reduce((s, i) => s + i.unitprice * i.quantity, 0)

        doc.text(`Month Total BV: ${totalBV.toFixed(2)}`, margin, finalY + 6)
        doc.text(`Month Total Amount: ${totalAmt.toFixed(2)}`, margin + 80, finalY + 6)

        grandTotals.amount += totalAmt
        grandTotals.bv += totalBV

        startY = finalY + 14
        startY = addPageIfNeeded(startY)
      })
    }
  }

  // === NEW: sales ===
  else if (props.reportType === 'sales') {
    const sales = props.reportData

    autoTable(doc, {
      startY,
      head: [['Date', 'Total Sales']],
      body: sales.map((s) => [dayjs(s.date).format('MMM D, YYYY'), s.total.toFixed(2)]),
      styles: { fontSize: 10 },
      margin: { left: margin, right: margin },
    })

    const totalAmt = sales.reduce((sum, s) => sum + (s.total || 0), 0)
    grandTotals.amount += totalAmt
    startY = doc.lastAutoTable.finalY + 10
  }

  // --- Grand Totals ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)

  const col1X = margin
  const col2X = 110
  const lineHeight = 8
  let y = startY + 10

  doc.text(`Grand Total Amount: ${grandTotals.amount.toFixed(2)}`, col1X, y)
  doc.text(`Grand Total BV: ${grandTotals.bv.toFixed(2)}`, col2X, y)
  y += lineHeight
  doc.text(`Printed by: ${auth.userDetails.firstname || 'System User'}`, col1X, y)
  doc.text(`Date: ${new Date().toLocaleString()}`, col2X, y)

  const fileName = `${props.reportType}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
}
</script>
