import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-checkbox-cell',
  templateUrl: './checkbox-cell.component.html',
  styleUrls: ['./checkbox-cell.component.css']
})
export class CheckboxCellComponent implements OnInit {
  params: any;
  constructor(private http: HttpClient, private router: Router) {}

  agInit(params) {
    this.params = params;
  }

  ngOnInit() {}

}
