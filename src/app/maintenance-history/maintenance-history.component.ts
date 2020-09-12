import { Component, OnInit, ViewChild, Input } from '@angular/core'
import { ClownService } from '../clown.service'
import { IDatasource, IGetRowsParams } from 'ag-grid-community'
import { Subject, of } from 'rxjs'
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators'
import { NgbModal, ModalDismissReasons, NgbDateParserFormatter, NgbModalRef } from '@ng-bootstrap/ng-bootstrap'
import * as FileSaver from 'file-saver'
import { NgbDateCustomParserFormatter } from '../util/NgbDateCustomParserFormatter'
import { sanitizeSearchTerm, sanitizeFormDataForRead, sanitizeFormDataForWrite } from '../util/Elves'
import { ActivatedRoute } from '@angular/router'
import { Router } from '@angular/router'
import { ButtonCellComponent } from '../button-cell/button-cell.component'
import { NgxSpinnerService } from "ngx-spinner"

@Component({
  selector: 'app-maintenance-history',
  templateUrl: './maintenance-history.component.html',
  styleUrls: ['./maintenance-history.component.css'],
  providers: [
    { provide: NgbDateParserFormatter, useClass: NgbDateCustomParserFormatter }
  ]
})
export class MaintenanceHistoryComponent implements OnInit {
  rowData = []
  columnDefs = [
    { headerName: 'Work Order No.', field: 'workOrderNumber' },
    { headerName: 'Work Order Date', field: 'workOrderDate' },
    { headerName: 'Work Order Type', field: 'workOrderType' },
    { headerName: 'Reported By', field: 'reportedBy' },
    { headerName: 'Action Taken', field: 'actionTaken', sortable: false, width: 800 },
    { headerName: 'Attachment', field: 'attachment', sortable: false,
      cellRendererFramework: ButtonCellComponent
    },
    { headerName: 'Created On', field: 'createdAt' },
    { headerName: 'UpdatedOn', field: 'updatedAt' }
  ]
  defaultColDef = {
    sortable: true,
    resizable: true,
    unSortIcon: true
  }
  paginationPageSize = 100
  cacheBlockSize = 250
  private gridApi
  private columnApi

  private sortBy = null
  private sortOrder = null
  private isFilterOn = false
  private fullRefresh = false
  private miniRefresh = false
  private searchTerms = new Subject<string>()
  private searchTerm = ''
  private dataSource: IDatasource
  private subscription: any
  private modalReference: NgbModalRef
  private isSaving = false
  private isDeleting = false
  private hasError = false
  private isInsert = false

  @ViewChild('rowModal') private rowModal
  @Input() currentRecord
  @Input() attachment = {}
  @Input() machineId: string
  isSearching = false
  isDownloadingCsv = false

  constructor(
    private clownService: ClownService, 
    private modalService: NgbModal, 
    private router: Router, 
    private route: ActivatedRoute,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit() {
    this.searchTerms.pipe(
      // wait X-ms after each keystroke before considering the term
      debounceTime(400),
      // ignore new term if same as previous term
      distinctUntilChanged(),
      // switch to new search observable each time the term changes
      switchMap((term: string) => of(term))).
      subscribe(response => {
        this.fullRefresh = true
        if (!response.trim()) {
          this.isFilterOn = false
        } else {
          this.searchTerm = sanitizeSearchTerm(response)
          this.isFilterOn = true
        }
        this.gridApi.setSortModel(null)
      })

    this.subscription = this.route.params.subscribe(params => {
      this.machineId = params['id']
    })
  }

  onGridReady(params) {
    this.gridApi = params.api
    this.columnApi = params.columnApi

    this.dataSource = {
      getRows: (params: IGetRowsParams) => {
        this.refreshSortModel(params.sortModel)
        if (!this.isFilterOn) {
          this.getHistory(params)
        } else {
          this.getHistoryThroughSearch(params)
        }
      }
    }
    this.gridApi.setDatasource(this.dataSource)
  }

  onRowDoubleClicked(params) {
    this.isInsert = false
    this.currentRecord = sanitizeFormDataForRead(params['data'])
    this.modalReference = this.modalService.open(this.rowModal, { windowClass: "xl", beforeDismiss: () => !this.isSaving && !this.isDeleting })
    this.modalReference.result.then((result) => {
      this.miniRefresh = true
      this.gridApi.setSortModel(this.gridApi.getSortModel())
    }, (reason) => {
      this.clearModalState()
    })
  }

  onSubmit() {
    this.insertOrUpdateHistory(this.currentRecord['workOrderNumber'], sanitizeFormDataForWrite(this.currentRecord), this.attachment)
  }

  onDelete() {
    this.deleteHistory(this.currentRecord['workOrderNumber'])
  }

  searchHistory(term: string) {
    if (term.length > 0 && term.length < 3) {
      return
    }
    this.searchTerms.next(term)
  }

  insertHistoryModal() {
    this.isInsert = true
    this.currentRecord = { 'serialNumber': this.machineId }
    this.modalReference = this.modalService.open(this.rowModal, { windowClass: "xl", beforeDismiss: () => !this.isSaving && !this.isDeleting })
    this.modalReference.result.then((result) => {
      this.miniRefresh = true
      this.gridApi.setSortModel(this.gridApi.getSortModel())
    }, (reason) => {
      this.clearModalState()
    })
  }

  clearModalState() {
    this.hasError = false
    this.isDeleting = false
    this.isSaving = false
    this.attachment = {}
  }

  refreshSortModel(sortModel) {
    if (this.fullRefresh) {
      this.sortBy = null
      this.sortOrder = null
      this.fullRefresh = false
      return
    } else if (this.miniRefresh) {
      this.miniRefresh = false
      return
    }
    
    if (sortModel.length != 0) {
      var newSortCol = sortModel[0]['colId']
      var newSortOrder = sortModel[0]['sort']
      if (newSortCol != this.sortBy || newSortOrder != this.sortOrder) {
        this.sortBy = newSortCol
        this.sortOrder = newSortOrder
      }
    } else {
      if (this.sortBy && this.sortOrder) {
        this.sortBy = null
        this.sortOrder = null
      }
    }
  }

  downloadFile() {
    this.getAttachment(this.machineId + '_' + this.currentRecord['workOrderNumber'], this.currentRecord['attachment'])
  }

  removeFile() {
    this.currentRecord['attachment'] = ""
  }

  uploadFile(event) {
    this.removeFile()
    var fileList: FileList = event.target.files
    if (fileList.length > 0) {
      var file:File = fileList[0]
      var formData:FormData = new FormData()
      formData.append('file', file, file.name)
      this.attachment['filename'] = file.name
      this.attachment['file'] = formData
    } else {
      this.attachment = {}
    }
  }

  getAttachment(id: string, filename: string) {
    this.clownService.getAttachment(id, filename).subscribe(response => {
      FileSaver.saveAs(response['blob'], response['fileName'])
    }, (err: any) => {
      this.handleError(err)
    })
  }

  getHistory(params: IGetRowsParams) {
    this.spinner.show()
    this.clownService.getHistory(this.machineId, this.cacheBlockSize, params.startRow, this.sortBy, this.sortOrder).subscribe(response => {
      var history: any = response['data']
      var totalNumOfRecords: any = response['count']
      params.successCallback(history, totalNumOfRecords)
      this.gridApi.sizeColumnsToFit()

      this.spinner.hide()
    }, (err: any) => {
      this.handleError(err)
    })
  }

  getHistoryThroughSearch(params: IGetRowsParams) {
    this.isSearching = true
    this.clownService.searchHistory(this.machineId, this.searchTerm, this.cacheBlockSize, params.startRow, this.sortBy, this.sortOrder).subscribe(response => {
      var history: any = response['data']
      var totalNumOfRecords: any = response['count']
      params.successCallback(history, totalNumOfRecords)
      this.gridApi.sizeColumnsToFit()

      this.isSearching = false
    }, (err: any) => {
      this.handleError(err)
    })
  }

  insertOrUpdateHistory(workOrderNumber: string, values: {}, attachment: {}) {
    this.isSaving = true
    this.hasError = false
    this.clownService.insertAttachment(this.machineId + '_' + workOrderNumber, attachment['file']).subscribe(_ => {
      if (attachment['filename']) {
        values['attachment'] = attachment['filename']
      }
      if (this.isInsert) {
        this.insertHistory(values)
      } else {
        this.updateHistory(workOrderNumber, values)
      }
    }, (err: Error) => {
      this.isSaving = false
      this.hasError = true
    })
  }

  insertHistory(history: {}) {
    this.clownService.insertHistory(this.machineId, history).subscribe(() => {
      this.isSaving = false
      this.modalReference.close()
      this.attachment = {} 
    }, (err: Error) => {
      this.isSaving = false
      this.hasError = true
      this.handleError(err)
    })
  }

  updateHistory(workOrderNumber:string, newValues: {}) {
    this.clownService.updateHistory(this.machineId, workOrderNumber, newValues).subscribe(() => {
      this.isSaving = false
      this.modalReference.close()
      this.attachment = {}
    }, (err: Error) => {
      this.isSaving = false
      this.hasError = true
      this.handleError(err)
    })
  }

  deleteHistory(workOrderNumber: string) {
    this.isDeleting = true
    this.hasError = false
    this.clownService.deleteHistory(this.machineId, workOrderNumber).subscribe(() => {
      this.isDeleting = false
      this.modalReference.close()
      this.attachment = {} 
    }, (err: Error) => {
      this.isDeleting = false
      this.hasError = true
      this.handleError(err)
    })
  }

  downloadToCsv() {
    this.isDownloadingCsv = true
    if (!this.isFilterOn) {
      this.clownService.getHistory(this.machineId).subscribe(response => {
        this.createCsvFile(response['data'])
        this.isDownloadingCsv = false
      }, (err: any) => {
        this.handleError(err)
      })
    } else {
      this.clownService.searchHistory(this.machineId, this.searchTerm).subscribe(response => {
        this.createCsvFile(response['data'])
        this.isDownloadingCsv = false
      }, (err: any) => {
        this.handleError(err)
      })
    }
  }

  createCsvFile(history) {
    if(history.length == 0) {
      return
    }

    var csvString = []
    var need_headers = true
    history.forEach(hist => {
      var tmp = []
      var headers = []
      for (var key in hist) {
        headers.push(key)
        tmp.push('"' + hist[key] + '"')
      }

      if (need_headers) {
        csvString.push(headers.join(','))
        need_headers = false
      }

      csvString.push(tmp.join(','))
    })
    
    var now = new Date().toISOString().substring(0,19).replace(/T|-|:/g,"")
    var blob = new Blob([csvString.join('\r\n')], {type: 'text/csv' })
    FileSaver.saveAs(blob, "maintenance_" + now + ".csv")
  }

  logout() {
    this.spinner.show()
    this.clownService.logout().subscribe(_ => {
      this.spinner.hide()
      this.router.navigate(['/login'])
    })
  }

  handleError(err: any) {
    if (err.status == 401) {
      this.logout()
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe()
  }

}
