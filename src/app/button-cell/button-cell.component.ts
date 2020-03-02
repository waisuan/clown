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
  attachment_name: any;
  attachment_id: any
  constructor(private clownService: ClownService, private http: HttpClient, private router: Router) {}

  agInit(params) {
    this.attachment_name = params['data']['attachment_name'];
    this.attachment_id = params['data']['attachment'];
  }

  ngOnInit() {}

  downloadFile() {
    this.clownService.getAttachment(this.attachment_id).subscribe(response => {
      FileSaver.saveAs(response['blob'], response['fileName']);
    });
  }

}
