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
import { padNumber } from '../util/Elves';

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
  private forceRefresh = false;
  private searchTerms = new Subject<string>();
  private dataSource: IDatasource;
  private searchTerm = '';
  private modalReference: NgbModalRef;
  private isLoading = false;

  @ViewChild('agGrid') agGrid: AgGridNg2;
  @ViewChild('machineModal') private machineModal;
  @Input() currentMachine;

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
        console.log(response);
        this.forceRefresh = true;
        if (!response.trim()) {
          this.isFilterOn = false;
        } else {
          this.searchTerm = this.sanitizeSearchTerm(response);
          console.log(this.searchTerm);
          this.isFilterOn = true;
        }
        this.gridApi.setSortModel(null);
      });
  }

  onGridReady(params) {
    this.gridApi = params.api;
    this.columnApi = params.columnApi;

    this.dataSource = {
      getRows: (params: IGetRowsParams) => {
        console.log("asking for " + params.startRow + " to " + params.endRow);
        this.refreshSortModel(params.sortModel);
        if (!this.isFilterOn) {
          console.log('!isFilterOn');
          this.getMachines(params);
        } else {
          console.log('isFilterOn');
          this.getMachinesThroughSearch(params);
        }
      }
    };
    this.gridApi.setDatasource(this.dataSource);
  }

  onRowDoubleClicked(params) {
    console.log(params);
    this.currentMachine = this.sanitizeFormDataForRead(params['data']);
    this.getAttachment('5cccfa90412c1719b05ef695');
    // this.modalReference = this.modalService.open(this.machineModal, { windowClass: "xl" });
    // this.modalReference.result.then((result) => {
    //   //todo don't refresh sorting ???
    //   this.forceRefresh = true;
    //   this.gridApi.setSortModel(null);
    // }, (reason) => { });
  }

  onSubmit() {
    this.updateMachine(this.currentMachine['serialNumber'], this.sanitizeFormDataForWrite(this.currentMachine));
  }

  refreshSortModel(sortModel) {
    if (this.forceRefresh) {
      this.sortBy = null;
      this.sortOrder = null;
      this.numOfMachinesFetchedSoFar = 0;
      this.forceRefresh = false;
      return;
    }
    
    if (sortModel.length != 0) {
      var newSortCol = sortModel[0]['colId'];
      var newSortOrder = sortModel[0]['sort'];
      if (newSortCol != this.sortBy || newSortOrder != this.sortOrder) {
        console.log(newSortCol + ", " + newSortOrder);
        this.sortBy = newSortCol;
        this.sortOrder = newSortOrder;
        this.numOfMachinesFetchedSoFar = 0;
      }
    } else {
      if (this.sortBy && this.sortOrder) {
        console.log('reset');
        this.sortBy = null;
        this.sortOrder = null;
        this.numOfMachinesFetchedSoFar = 0;
      }
    }
  }

  //////////////////////////////////////////////////////////

  sanitizeSearchTerm(response: string) {
    return response.replace(/\//g, '-');
  }

  sanitizeFormDataForRead(data: {}) {
    var sanitizedData = JSON.parse(JSON.stringify(data));
    if (sanitizedData['tncDate']) {
      var tokens = sanitizedData['tncDate'].split('/');
      sanitizedData['tncDate'] = { year: parseInt(tokens[2]), month: parseInt(tokens[1]), day: parseInt(tokens[0]) };
    }
    if (sanitizedData['ppmDate']) {
      var tokens = sanitizedData['ppmDate'].split('/');
      sanitizedData['ppmDate'] = { year: parseInt(tokens[2]), month: parseInt(tokens[1]), day: parseInt(tokens[0]) };
    }
    return sanitizedData;
  }

  sanitizeFormDataForWrite(data: {}) {
    var sanitizedData = JSON.parse(JSON.stringify(data));
    if (sanitizedData['tncDate']) {
      sanitizedData['tncDate'] = padNumber(sanitizedData['tncDate']['day']) + '/' + padNumber(sanitizedData['tncDate']['month']) + '/' + sanitizedData['tncDate']['year'];
    }
    if (sanitizedData['ppmDate']) {
      sanitizedData['ppmDate'] = padNumber(sanitizedData['ppmDate']['day']) + '/' + padNumber(sanitizedData['ppmDate']['month']) + '/' + sanitizedData['ppmDate']['year'];
    }
    return sanitizedData;
  }

  //////////////////////////////////////////////////////////

  getMachines(params: IGetRowsParams) {
    console.log('getMachines');
    this.clownService.getMachines(this.cacheBlockSize, this.numOfMachinesFetchedSoFar, this.sortBy, this.sortOrder).subscribe(response => {
      var machines = response['data'];
      var totalNumOfMachines = response['count'];
      this.numOfMachinesFetchedSoFar += this.cacheBlockSize;
      console.log(this.numOfMachinesFetchedSoFar);
      params.successCallback(machines, totalNumOfMachines);
      this.gridApi.sizeColumnsToFit();
    });
  }

  getMachinesThroughSearch(params: IGetRowsParams) {
    console.log('getMachinesThroughSearch');
    this.clownService.searchMachines(this.searchTerm, this.cacheBlockSize, this.numOfMachinesFetchedSoFar, this.sortBy, this.sortOrder).subscribe(response => {
      var machines = response['data'];
      var totalNumOfMachines = response['count'];
      this.numOfMachinesFetchedSoFar += this.cacheBlockSize;
      console.log(this.numOfMachinesFetchedSoFar);
      params.successCallback(machines, totalNumOfMachines);
      this.gridApi.sizeColumnsToFit();
    });
  }

  getAttachment(id: string) {
    this.clownService.getAttachment(id).subscribe(response => {
      FileSaver.saveAs(response['blob'], response['fileName']);
      // const url = window.URL.createObjectURL(response['blob']);
      // const status = window.open(url);
      // if (!status || status.closed || typeof status.closed == 'undefined') {
      //   //todo
      // }
    });
  }

  searchMachines(term: string) {
    this.searchTerms.next(term);
  }

  updateMachine(id: string, machine: {}) {
    this.isLoading = true;
    this.clownService.updateMachine(id, machine).subscribe(() => {
      //todo handle err
      setTimeout(() => {
        this.isLoading = false;
        this.modalReference.close(); 
      }, 1000); // 1s delay
    });
  }
}
