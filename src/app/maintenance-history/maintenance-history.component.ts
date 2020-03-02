import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { ClownService } from '../clown.service';
import { AgGridNg2 } from 'ag-grid-angular';
import { IDatasource, IGetRowsParams } from 'ag-grid-community';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { NgbModal, ModalDismissReasons, NgbDateParserFormatter, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import * as FileSaver from 'file-saver';
import { NgbDateCustomParserFormatter } from '../util/NgbDateCustomParserFormatter';
import { sanitizeSearchTerm, sanitizeFormDataForRead, sanitizeFormDataForWrite } from '../util/Elves';
import { environment } from '../../environments/environment';
import { ActivatedRoute } from '@angular/router';
import { ButtonCellComponent } from '../button-cell/button-cell.component';

@Component({
  selector: 'app-maintenance-history',
  templateUrl: './maintenance-history.component.html',
  styleUrls: ['./maintenance-history.component.css'],
  providers: [
    { provide: NgbDateParserFormatter, useClass: NgbDateCustomParserFormatter }
  ]
})
export class MaintenanceHistoryComponent implements OnInit {
  rowData = [];
  columnDefs = [
    { headerName: 'Work Order No.', field: 'workOrderNumber' },
    { headerName: 'Work Order Date', field: 'workOrderDate' },
    { headerName: 'Work Order Type', field: 'workOrderType' },
    { headerName: 'Reported By', field: 'reportedBy' },
    { headerName: 'Action Taken', field: 'actionTaken', sortable: false, width: 800 },
    { headerName: 'Attachment', field: 'attachment', sortable: false,
      cellRendererFramework: ButtonCellComponent
    },
    { headerName: 'Created On', field: 'dateOfCreation' },
    { headerName: 'UpdatedOn', field: 'lastUpdated' }
  ];
  defaultColDef = {
    sortable: true,
    resizable: true,
    unSortIcon: true
  };
  paginationPageSize = 100;
  cacheBlockSize = 250;
  private gridApi;
  private columnApi;

  private numOfRecordsFetchedSoFar = 0;
  private sortBy = null;
  private sortOrder = null;
  private isFilterOn = false;
  private fullRefresh = false;
  private miniRefresh = false;
  private searchTerms = new Subject<string>();
  private searchTerm = '';
  private dataSource: IDatasource;
  private machineId: string;
  private subscription: any;
  private modalReference: NgbModalRef;
  private isSaving = false;
  private isDeleting = false;
  private hasError = false;
  private isInsert = false;

  @ViewChild('rowModal') private rowModal;
  @Input() currentRecord;
  @Input() attachment = {};

  constructor(private clownService: ClownService, private modalService: NgbModal, private route: ActivatedRoute) {}

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

    this.subscription = this.route.params.subscribe(params => {
      this.machineId = params['id'];
    });
  }

  onGridReady(params) {
    this.gridApi = params.api;
    this.columnApi = params.columnApi;

    this.dataSource = {
      getRows: (params: IGetRowsParams) => {
        this.refreshSortModel(params.sortModel);
        if (!this.isFilterOn) {
          this.getHistory(params);
        } else {
          this.getHistoryThroughSearch(params);
        }
      }
    };
    this.gridApi.setDatasource(this.dataSource);
  }

  getRowHeight(params) {
    return 28 * (Math.floor(params.data.actionTaken.length / 60) + 1);
  };

  setRowsHeight() {
    let gridHeight = 0;

    this.gridApi.forEachNode(node => {
        let rowHeight = this.getRowHeight(node);

        node.setRowHeight(rowHeight);
        node.setRowTop(gridHeight);

        gridHeight += rowHeight;
    });

    if (!gridHeight) {
        return;
    }

    //this.gridApi.onRowHeightChanged();
    //this.gridApi.rowHeight = gridHeight;

    // let elements = this.el.nativeElement.getElementsByClassName('ag-body-container');
    // if (elements) {
    //   this.renderer.setElementStyle(elements[0], 'height', `${gridHeight}px`)
    // }
  }

  onRowDoubleClicked(params) {
    this.isInsert = false;
    this.currentRecord = sanitizeFormDataForRead(params['data']);
    this.modalReference = this.modalService.open(this.rowModal, { windowClass: "xl", beforeDismiss: () => !this.isSaving && !this.isDeleting });
    this.modalReference.result.then((result) => {
      this.miniRefresh = true;
      this.gridApi.setSortModel(this.gridApi.getSortModel());
    }, (reason) => {
      this.clearModalState();
    });
  }

  onSubmit() {
    this.insertOrUpdateHistory(this.currentRecord['_id'], sanitizeFormDataForWrite(this.currentRecord), this.attachment);
  }

  onDelete() {
    this.deleteHistory(this.currentRecord['_id']);
  }

  searchHistory(term: string) {
    this.searchTerms.next(term);
  }

  insertHistoryModal() {
    this.isInsert = true;
    this.currentRecord = { 'serialNumber': this.machineId };
    this.modalReference = this.modalService.open(this.rowModal, { windowClass: "xl", beforeDismiss: () => !this.isSaving && !this.isDeleting });
    this.modalReference.result.then((result) => {
      this.miniRefresh = true;
      this.gridApi.setSortModel(this.gridApi.getSortModel());
    }, (reason) => {
      this.clearModalState();
    });
  }

  clearModalState() {
    this.hasError = false;
    this.isDeleting = false;
    this.isSaving = false;
    this.attachment = {}
  }

  refreshSortModel(sortModel) {
    if (this.fullRefresh) {
      this.sortBy = null;
      this.sortOrder = null;
      this.numOfRecordsFetchedSoFar = 0;
      this.fullRefresh = false;
      return;
    } else if (this.miniRefresh) {
      this.numOfRecordsFetchedSoFar = 0;
      this.miniRefresh = false;
      return;
    }
    
    if (sortModel.length != 0) {
      var newSortCol = sortModel[0]['colId'];
      var newSortOrder = sortModel[0]['sort'];
      if (newSortCol != this.sortBy || newSortOrder != this.sortOrder) {
        this.sortBy = newSortCol;
        this.sortOrder = newSortOrder;
        this.numOfRecordsFetchedSoFar = 0;
      }
    } else {
      if (this.sortBy && this.sortOrder) {;
        this.sortBy = null;
        this.sortOrder = null;
        this.numOfRecordsFetchedSoFar = 0;
      }
    }
  }

  downloadFile() {
    this.getAttachment(this.currentRecord['attachment']);
  }

  removeFile() {
    this.currentRecord['attachment'] = "";
    this.currentRecord['attachment_name'] = "";
  }

  uploadFile(event) {
    this.removeFile();
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

  getAttachment(id: string) {
    this.clownService.getAttachment(id).subscribe(response => {
      FileSaver.saveAs(response['blob'], response['fileName']);
    });
  }

  getHistory(params: IGetRowsParams) {
    this.clownService.getHistory(this.machineId, this.cacheBlockSize, this.numOfRecordsFetchedSoFar, this.sortBy, this.sortOrder).subscribe(response => {
      var history = response['data'];
      var totalNumOfRecords = response['count'];
      this.numOfRecordsFetchedSoFar += this.cacheBlockSize;
      params.successCallback(history, totalNumOfRecords);
      this.gridApi.sizeColumnsToFit();
      //this.setRowsHeight();
    });
  }

  getHistoryThroughSearch(params: IGetRowsParams) {
    this.clownService.searchHistory(this.machineId, this.searchTerm, this.cacheBlockSize, this.numOfRecordsFetchedSoFar, this.sortBy, this.sortOrder).subscribe(response => {
      var history = response['data'];
      var totalNumOfRecords = response['count'];
      this.numOfRecordsFetchedSoFar += this.cacheBlockSize;
      params.successCallback(history, totalNumOfRecords);
      this.gridApi.sizeColumnsToFit();
    });
  }

  insertOrUpdateHistory(id: string, values: {}, attachment: {}) {
    this.isSaving = true;
    this.hasError = false;
    this.clownService.insertAttachment(id, attachment['file']).subscribe((attachmentId) => {
      if (attachmentId) {
        values['attachment'] = attachmentId['id'];
        values['attachment_name'] = attachment['filename'];
      }
      if (this.isInsert) {
        this.insertHistory(values);
      } else {
        this.updateHistory(id, values);
      }
    }, (err: Error) => {
      this.isSaving = false;
      this.hasError = true;
    });
  }

  insertHistory(history: {}) {
    this.clownService.insertHistory(history).subscribe(() => {
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

  updateHistory(id:string, newValues: {}) {
    this.clownService.updateHistory(id, newValues).subscribe(() => {
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

  deleteHistory(id: string) {
    this.isDeleting = true;
    this.hasError = false;
    this.clownService.deleteHistory(id).subscribe(() => {
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

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

}
