import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { ClownService } from '../clown.service';
import { AgGridNg2 } from 'ag-grid-angular';
import { IDatasource, IGetRowsParams } from 'ag-grid-community';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { NgbModal, ModalDismissReasons, NgbDateParserFormatter, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import * as FileSaver from 'file-saver';
import { NgbDateCustomParserFormatter } from '../util/NgbDateCustomParserFormatter';
import { sanitizeSearchTerm, sanitizeFormDataForRead, sanitizeFormDataForWrite } from '../util/Elves';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-machines',
  templateUrl: './machines.component.html',
  styleUrls: ['./machines.component.css'],
  providers: [
    { provide: NgbDateParserFormatter, useClass: NgbDateCustomParserFormatter }
  ]
})
export class MachinesComponent implements OnInit {
  rowData = [];
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
    { headerName: 'Created On', field: 'dateOfCreation' },
    { headerName: 'Updated On', field: 'lastUpdated' }
  ];
  defaultColDef = {
    sortable: true,
    resizable: true,
    unSortIcon: true,
  };
  paginationPageSize = 100;
  cacheBlockSize = 250;
  private gridApi;
  private columnApi;

  private numOfMachinesFetchedSoFar = 0;
  private sortBy = null;
  private sortOrder = null;
  private isFilterOn = false;
  private fullRefresh = false;
  private miniRefresh = false;
  private searchTerms = new Subject<string>();
  private dataSource: IDatasource;
  private searchTerm = '';
  private modalReference: NgbModalRef;
  private isSaving = false;
  private isDeleting = false;
  private hasError = false;
  private isInsert = false;

  @ViewChild('agGrid') agGrid: AgGridNg2;
  @ViewChild('machineModal') private machineModal;
  @Input() currentMachine;
  @Input() attachment = {};
  @Input() dueMachines = [];

  // todo spinner
  constructor(private clownService: ClownService, private modalService: NgbModal, private spinner: NgxSpinnerService) { }

  ngOnInit() {
    this.searchTerms.pipe(
      // wait X-ms after each keystroke before considering the term
      debounceTime(300),
      // ignore new term if same as previous term
      distinctUntilChanged(),
      // switch to new search observable each time the term changes
      switchMap((term: string) => of(term))).
      subscribe(response => {
        this.fullRefresh = true;
        if (!response.trim()) {
          this.isFilterOn = false;
        } else {
          this.searchTerm = sanitizeSearchTerm(response);
          this.isFilterOn = true;
        }
        this.gridApi.setSortModel(null);
      });

    var ws = new WebSocket(environment.websocketUrl);
    ws.onopen = () => {};
    ws.onmessage = (received) => {
        console.log(received.data);
        if (received.data) {
          this.dueMachines = JSON.parse(received.data);
        }
    };
  }

  onGridReady(params) {
    this.gridApi = params.api;
    this.columnApi = params.columnApi;

    this.dataSource = {
      getRows: (params: IGetRowsParams) => {
        this.refreshSortModel(params.sortModel);
        if (!this.isFilterOn) {
          this.getMachines(params);
        } else {
          this.getMachinesThroughSearch(params);
        }
      }
    };
    this.gridApi.setDatasource(this.dataSource);
  }

  insertMachineModal() {
    this.isInsert = true;
    this.currentMachine = {};
    this.modalReference = this.modalService.open(this.machineModal, { windowClass: "xl", beforeDismiss: () => !this.isSaving && !this.isDeleting });
    this.modalReference.result.then((result) => {
      this.miniRefresh = true;
      this.gridApi.setSortModel(this.gridApi.getSortModel());
    }, (reason) => {
      this.clearModalState();
    });
  }

  onRowDoubleClicked(params) {
    this.isInsert = false;
    this.currentMachine = sanitizeFormDataForRead(params['data']);
    this.modalReference = this.modalService.open(this.machineModal, { windowClass: "xl", beforeDismiss: () => !this.isSaving && !this.isDeleting });
    this.modalReference.result.then((result) => {
      this.miniRefresh = true;
      this.gridApi.setSortModel(this.gridApi.getSortModel());
    }, (reason) => {
      this.clearModalState();
    });
  }

  onSubmit() {
    this.insertOrUpdateMachine(this.currentMachine['serialNumber'], sanitizeFormDataForWrite(this.currentMachine), this.attachment);
  }

  onDelete() {
    this.deleteMachine(this.currentMachine['serialNumber']);
  }

  downloadFile() {
    this.getAttachment(this.currentMachine['attachment']);
  }

  removeFile() {
    this.currentMachine['attachment'] = "";
    this.currentMachine['attachment_name'] = "";
  }

  uploadFile(event) {
    var fileList: FileList = event.target.files;
    if (fileList.length > 0) {
      var file:File = fileList[0];
      var formData:FormData = new FormData();
      formData.append('attachment', file, file.name);
      this.attachment['filename'] = file.name;
      this.attachment['file'] = formData;
    } else {
      this.attachment = {}
    }
  }

  refreshSortModel(sortModel) {
    if (this.fullRefresh) {
      this.sortBy = null;
      this.sortOrder = null;
      this.numOfMachinesFetchedSoFar = 0;
      this.fullRefresh = false;
      return;
    } else if (this.miniRefresh) {
      this.numOfMachinesFetchedSoFar = 0;
      this.miniRefresh = false;
      return;
    }
    
    if (sortModel.length != 0) {
      var newSortCol = sortModel[0]['colId'];
      var newSortOrder = sortModel[0]['sort'];
      if (newSortCol != this.sortBy || newSortOrder != this.sortOrder) {
        this.sortBy = newSortCol;
        this.sortOrder = newSortOrder;
        this.numOfMachinesFetchedSoFar = 0;
      }
    } else {
      if (this.sortBy && this.sortOrder) {;
        this.sortBy = null;
        this.sortOrder = null;
        this.numOfMachinesFetchedSoFar = 0;
      }
    }
  }

  clearModalState() {
    this.hasError = false;
    this.isDeleting = false;
    this.isSaving = false;
    this.attachment = {}
  }

  getMachines(params: IGetRowsParams) {
    this.clownService.getMachines(this.cacheBlockSize, this.numOfMachinesFetchedSoFar, this.sortBy, this.sortOrder).subscribe(response => {
      var machines = response['data'];
      var totalNumOfMachines = response['count'];
      this.numOfMachinesFetchedSoFar += this.cacheBlockSize;
      params.successCallback(machines, totalNumOfMachines);
      this.gridApi.sizeColumnsToFit();
    });
  }

  getMachinesThroughSearch(params: IGetRowsParams) {
    this.clownService.searchMachines(this.searchTerm, this.cacheBlockSize, this.numOfMachinesFetchedSoFar, this.sortBy, this.sortOrder).subscribe(response => {
      var machines = response['data'];
      var totalNumOfMachines = response['count'];
      this.numOfMachinesFetchedSoFar += this.cacheBlockSize;
      params.successCallback(machines, totalNumOfMachines);
      this.gridApi.sizeColumnsToFit();
    });
  }

  getAttachment(id: string) {
    this.clownService.getAttachment(id).subscribe(response => {
      FileSaver.saveAs(response['blob'], response['fileName']);
    });
  }

  searchMachines(term: string) {
    this.searchTerms.next(term);
  }

  insertOrUpdateMachine(id: string, machine: {}, attachment: {}) {
    this.isSaving = true;
    this.hasError = false;
    this.clownService.insertAttachment(id, attachment['file']).subscribe((attachmentId) => {
      if (attachmentId) {
        machine['attachment'] = attachmentId['id'];
        machine['attachment_name'] = attachment['filename'];
      }
      if (this.isInsert) {
        this.insertMachine(machine);
      } else {
        this.updateMachine(id, machine);
      }
    }, (err: Error) => {
      this.isSaving = false;
      this.hasError = true;
    });
  }

  insertMachine(machine: {}) {
    this.clownService.insertMachine(machine).subscribe(() => {
      setTimeout(() => {
        this.isSaving = false;
        this.modalReference.close();
        this.attachment = {}; 
      }, 3000); // Xs delay
    }, (err: Error) => {
      this.isSaving = false;
      this.hasError = true;
    });
  }

  updateMachine(id:string, machine: {}) {
    this.clownService.updateMachine(id, machine).subscribe(() => {
      setTimeout(() => {
        this.isSaving = false;
        this.modalReference.close();
        this.attachment = {}; 
      }, 3000); // Xs delay
    }, (err: Error) => {
      this.isSaving = false;
      this.hasError = true;
    });
  }

  deleteMachine(id: string) {
    this.isDeleting = true;
    this.hasError = false;
    this.clownService.deleteMachine(id).subscribe(() => {
      setTimeout(() => {
        this.isDeleting = false;
        this.modalReference.close();
        this.attachment = {}; 
      }, 3000); // Xs delay
    }, (err: Error) => {
      this.isDeleting = false;
      this.hasError = true;
    });
  }
}
