import { Component, OnInit, ViewChild, Input } from '@angular/core'
import { ClownService } from '../clown.service'
import { AgGridNg2 } from 'ag-grid-angular'
import { IDatasource, IGetRowsParams } from 'ag-grid-community'
import { Subject, of } from 'rxjs'
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators'
import { NgbModal, ModalDismissReasons, NgbDateParserFormatter, NgbModalRef } from '@ng-bootstrap/ng-bootstrap'
import * as FileSaver from 'file-saver'
import { NgbDateCustomParserFormatter } from '../util/NgbDateCustomParserFormatter'
import { sanitizeSearchTerm, sanitizeFormDataForRead, sanitizeFormDataForWrite } from '../util/Elves'
import { environment } from '../../environments/environment'
import { Router } from '@angular/router'
import { ButtonCellComponent } from '../button-cell/button-cell.component'
import { CheckboxCellComponent } from '../checkbox-cell/checkbox-cell.component'
import { NgxSpinnerService } from "ngx-spinner"
import { logging } from 'protractor'
import { param } from 'jquery'

@Component({
  selector: 'app-machines',
  templateUrl: './machines.component.html',
  styleUrls: ['./machines.component.css'],
  providers: [
    { provide: NgbDateParserFormatter, useClass: NgbDateCustomParserFormatter }
  ]
})
export class MachinesComponent implements OnInit {
  rowData = []
  columnDefs = [
    { headerName: 'Serial No.', field: 'serialNumber' },
    { headerName: 'Customer', field: 'customer' },
    { headerName: 'State', field: 'state' },
    { headerName: 'District', field: 'district' },
    { headerName: 'Type', field: 'accountType' },
    { headerName: 'Model', field: 'model' },
    { headerName: 'Brand', field: 'brand' },
    { headerName: 'Status', field: 'status' },
    { headerName: 'TNC Date', field: 'tncDate' },
    { headerName: 'PPM Date', field: 'ppmDate' },
    { headerName: 'Reported By', field: 'reportedBy' },
    { headerName: 'Assignee', field: 'personInCharge' },
    { headerName: 'Attachment', field: 'attachment', sortable: false,
      cellRendererFramework: ButtonCellComponent
    },
    { headerName: 'Notes?', field: 'additionalNotes', sortable: false, width: 105,
      cellRendererFramework: CheckboxCellComponent
    },
    { headerName: 'Created On', field: 'createdAt' },
    { headerName: 'Updated On', field: 'updatedAt' }
  ]
  defaultColDef = {
    sortable: true,
    resizable: true,
    unSortIcon: true,
  }
  paginationPageSize = 100
  cacheBlockSize = 200
  private gridApi
  private columnApi

  private ws
  private sortBy = null
  private sortOrder = null
  private isFilterOn = false
  private fullRefresh = false
  private miniRefresh = false
  private searchTerms = new Subject<string>()
  private dataSource: IDatasource
  private searchTerm = ''
  private modalReference: NgbModalRef
  private isSaving = false
  private isDeleting = false
  private hasError = false
  private isInsert = false
  private showDueMachinesOnly = false
  private showDueMachineOptions = { 'almost_due': 0, 'due': 0, 'overdue': 0 }
  private showDueMachineStatus

  @ViewChild('agGrid') agGrid: AgGridNg2
  @ViewChild('machineModal') private machineModal
  @Input() currentMachine
  @Input() attachment = {}
  @Input() dueMachinesCount = 0
  @Input() selectedMachine
  isSearching = false
  isDownloadingCsv = false
  apiUrl = environment.apiUrl

  constructor(
    private clownService: ClownService, 
    private modalService: NgbModal, 
    private router: Router, 
    private spinner: NgxSpinnerService
  ) { }

  isAdmin() {
    return this.clownService.isAdmin()
  }

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

    this.ws = new WebSocket(environment.machinesWebsocketUrl)
    this.ws.onmessage = (received) => {
      console.log(received)
      if (received.data) {
        this.dueMachinesCount = JSON.parse(received.data)
      }
    }
  }

  onGridReady(params) {
    this.gridApi = params.api
    this.columnApi = params.columnApi

    this.dataSource = {
      getRows: (params: IGetRowsParams) => {
        this.refreshSortModel(params.sortModel)
        if (this.showDueMachinesOnly) {
          this.getDueMachines(params)
        } else if (!this.isFilterOn) {
          this.getMachines(params)
        } else {
          this.getMachinesThroughSearch(params)
        }
      }
    }
    this.gridApi.setDatasource(this.dataSource)
  }

  insertMachineModal() {
    this.isInsert = true
    this.currentMachine = {}
    this.modalReference = this.modalService.open(this.machineModal, { windowClass: "xl", beforeDismiss: () => !this.isSaving && !this.isDeleting })
    this.modalReference.result.then((result) => {
      this.miniRefresh = true
      this.gridApi.setSortModel(this.gridApi.getSortModel())
    }, (reason) => {
      this.clearModalState()
    })
  }

  showHistory() {
    this.router.navigate(['/history', this.selectedMachine])
  }

  onRowClicked(params) {
    this.selectedMachine = params['data']['serialNumber']
  }

  onRowDoubleClicked(params) {
    this.isInsert = false
    this.currentMachine = sanitizeFormDataForRead(params['data'])
    this.modalReference = this.modalService.open(this.machineModal, { windowClass: "xl", beforeDismiss: () => !this.isSaving && !this.isDeleting })
    this.modalReference.result.then((result) => {
      this.miniRefresh = true
      this.gridApi.setSortModel(this.gridApi.getSortModel())
    }, (reason) => {
      this.clearModalState()
    })
  }

  onSubmit() {
    this.insertOrUpdateMachine(this.currentMachine['serialNumber'], sanitizeFormDataForWrite(this.currentMachine), this.attachment)
  }

  onDelete() {
    this.deleteMachine(this.currentMachine['serialNumber'])
  }

  onShowDueMachines(status) {
    this.showDueMachineOptions[status] ^= 1
    this.showDueMachineStatus = []
    for (var k in this.showDueMachineOptions) {
      if (this.showDueMachineOptions[k]) {
        this.showDueMachineStatus.push(k)
      }
    }
    this.fullRefresh = true
    this.showDueMachinesOnly = this.showDueMachineStatus.length > 0 ? true : false
    this.gridApi.setSortModel(null)
  }

  downloadFile() {
    this.getAttachment(this.currentMachine['serialNumber'], this.currentMachine['attachment'])
  }

  removeFile() {
    this.currentMachine['attachment'] = null
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

  clearModalState() {
    this.hasError = false
    this.isDeleting = false
    this.isSaving = false
    this.attachment = {}
  }

  getMachines(params: IGetRowsParams) {
    this.spinner.show()
    this.clownService.getMachines(this.cacheBlockSize, params.startRow, this.sortBy, this.sortOrder).subscribe(response => {
      var machines: any = response['data']
      var totalNumOfMachines: any = response['count']
      params.successCallback(machines, totalNumOfMachines)
      this.gridApi.sizeColumnsToFit()

      this.spinner.hide()
    }, (err: any) => {
      this.handleError(err)
    })
  }

  getMachinesThroughSearch(params: IGetRowsParams) {
    this.isSearching = true
    this.clownService.searchMachines(this.searchTerm, this.cacheBlockSize, params.startRow, this.sortBy, this.sortOrder).subscribe(response => {
      var machines: any = response['data']
      var totalNumOfMachines: any = response['count']
      params.successCallback(machines, totalNumOfMachines)
      this.gridApi.sizeColumnsToFit()

      this.isSearching = false
    }, (err: any) => {
      this.handleError(err)
    })
  }

  getDueMachines(params: IGetRowsParams) {
    this.spinner.show()
    this.clownService.getDueMachines().subscribe(response => {
      var machines = (response as Array<any>)
        .filter(machine => this.showDueMachineStatus.indexOf(machine.ppmStatus) !== -1)
        .sort((a, b) => (a[this.sortBy] > b[this.sortBy]) ? (this.sortOrder == 'asc' ? 1 : -1) : (this.sortOrder == 'asc' ? -1 : 1))
        .slice(params.startRow, params.startRow + this.cacheBlockSize)
      var totalNumOfMachines = machines.length
      params.successCallback(machines, totalNumOfMachines)
      this.gridApi.sizeColumnsToFit()

      this.spinner.hide()
    }, (err: any) => {
      this.handleError(err)
    })
  }

  getAttachment(id: string, filename: string) {
    this.clownService.getAttachment(id, filename).subscribe(response => {
      FileSaver.saveAs(response['blob'], response['fileName'])
    }, (err: any) => {
      this.handleError(err)
    })
  }

  searchMachines(term: string) {
    if (term.length > 0 && term.length < 3) {
      return
    }
    this.searchTerms.next(term)
  }

  insertOrUpdateMachine(id: string, machine: {}, attachment: {}) {
    this.isSaving = true
    this.hasError = false
    this.clownService.insertAttachment(id, attachment['file']).subscribe(_ => {
      if (attachment['filename']) {
        machine['attachment'] = attachment['filename']
      }
      if (this.isInsert) {
        this.insertMachine(machine)
      } else {
        this.updateMachine(id, machine)
      }
    }, (err: Error) => {
      this.isSaving = false
      this.hasError = true
    })
  }

  insertMachine(machine: {}) {
    this.clownService.insertMachine(machine).subscribe(dueCount => {
      this.dueMachinesCount = dueCount as number
      this.isSaving = false
      this.modalReference.close()
      this.attachment = {} 
    }, (err: Error) => {
      this.isSaving = false
      this.hasError = true
      this.handleError(err)
    })
  }

  updateMachine(id:string, machine: {}) {
    this.clownService.updateMachine(id, machine).subscribe(dueCount => {
      this.dueMachinesCount = dueCount as number
      this.isSaving = false
      this.modalReference.close()
      this.attachment = {} 
    }, (err: Error) => {
      this.isSaving = false
      this.hasError = true
      this.handleError(err)
    })
  }

  deleteMachine(id: string) {
    this.isDeleting = true
    this.hasError = false
    this.clownService.deleteMachine(id).subscribe(dueCount => {
      this.dueMachinesCount = dueCount as number
      this.isDeleting = false
      this.modalReference.close()
      this.attachment = {} 
    }, (err: Error) => {
      this.isDeleting = false
      this.hasError = true
      this.handleError(err)
    })
  }

  logout() {
    this.spinner.show()
    this.ws.close()
    this.clownService.logout().subscribe(_ => {
      this.spinner.hide()
      this.router.navigate(['/login'])
    })
  }

  downloadToCsv() {
    this.isDownloadingCsv = true
    if (this.showDueMachinesOnly) {
      this.clownService.getDueMachines().subscribe(response => {
        this.createCsvFile(response['data'])
        this.isDownloadingCsv = false
      }, (err: any) => {
        this.handleError(err)
      })
    } else if (!this.isFilterOn) {
      this.clownService.getMachines().subscribe(response => {
        this.createCsvFile(response['data'])
        this.isDownloadingCsv = false
      }, (err: any) => {
        this.handleError(err)
      })
    } else {
      this.clownService.searchMachines(this.searchTerm).subscribe(response => {
        this.createCsvFile(response['data'])
        this.isDownloadingCsv = false
      }, (err: any) => {
        this.handleError(err)
      })
    }
  }

  createCsvFile(machines) {
   if (machines.length == 0) {
     return
   }

    var csvString = []
    var need_headers = true
    machines.forEach(machine => {
      var tmp = []
      var headers = []
      for (var key in machine) {
        headers.push(key)
        tmp.push('"' + machine[key] + '"')
      }
      
      if (need_headers) {
        csvString.push(headers.join(','))
        need_headers = false
      }

      csvString.push(tmp.join(','))
    })
    
    var now = new Date().toISOString().substring(0,19).replace(/T|-|:/g,"")
    var blob = new Blob([csvString.join('\r\n')], {type: 'text/csv' })
    FileSaver.saveAs(blob, "machines_" + now + ".csv")
  }

  handleError(err: any) {
    if (err.status == 401) {
      this.logout()
    }
  }
}
