import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ClownService } from '../clown.service';
import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-button-cell',
  templateUrl: './button-cell.component.html',
  styleUrls: ['./button-cell.component.css']
})
export class ButtonCellComponent implements OnInit {
  attachment: any;
  id: any;
  constructor(private clownService: ClownService, private http: HttpClient, private router: Router) {}

  agInit(params) {
    if (params['data']) {
      if ('workOrderNumber' in params['data']) {
        this.id = params['data']['serialNumber'] + '_' + params['data']['workOrderNumber']
      } else if ('serialNumber' in params['data']) {
        this.id = params['data']['serialNumber']
      }
      this.attachment = params['data']['attachment'];
    }
  }

  ngOnInit() {}

  downloadFile() {
    this.clownService.getAttachment(this.id, this.attachment).subscribe(response => {
      FileSaver.saveAs(response['blob'], response['fileName']);
    });
  }

}
