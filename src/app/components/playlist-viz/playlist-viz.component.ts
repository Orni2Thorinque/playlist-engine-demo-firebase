import { Component, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatIconRegistry } from '@angular/material';
import { Content } from '../../shared/models/content.model';
import { getRandomColor } from '../../shared/utils/color.utils';
import { DomSanitizer } from '@angular/platform-browser';
import { PlaylistVizService } from './playlist-viz.service';

export interface PieData {
  colors: string[];
  data: { name: string, value: number }[];
}

@Component({
  selector: 'app-playlist-viz',
  templateUrl: './playlist-viz.component.html',
  styleUrls: ['./playlist-viz.component.css']
})
export class PlaylistVizComponent implements AfterViewInit {
  public windowDim: [number, number] = [0, 0];
  get pieWidth() {
    return this.windowDim[0] - 20;
  }

  public pieHeight = 0;

  public nameCtrl = new FormControl(null, Validators.required);
  public contents: Content[] = [{
    color: getRandomColor(),
    name: 'C1',
    saturation: 3,
    duration: 4
  }, {
    color: getRandomColor(),
    name: 'C2',
    saturation: 2,
    duration: 1
  }, {
    color: getRandomColor(),
    name: 'C3',
    saturation: 1,
    duration: 1
  }];

  public isDoughnut = false;
  public editedContent: Content;
  public saturation: number;
  public duration: number;

  public data: { name: string, value: number }[];
  public colors: { domain: string[] };

  @ViewChild('contentInput') contentInput: ElementRef;
  @ViewChild('chips') chips: ElementRef;
  @ViewChild('control') control: ElementRef;
  @ViewChild('pie') pie: ElementRef;

  @HostListener('window:resize', ['$event']) onResize(event: Event) {
    this.windowDim = [this.elRef.nativeElement.clientWidth, this.elRef.nativeElement.clientHeight];
  }

  constructor(private playlistService: PlaylistVizService, private elRef: ElementRef,
    iconRegistry: MatIconRegistry, sanitizer: DomSanitizer) {
    iconRegistry.addSvgIcon('add', sanitizer.bypassSecurityTrustResourceUrl('assets/add.svg'))
      .addSvgIcon('cancel', sanitizer.bypassSecurityTrustResourceUrl('assets/cancel.svg'))
      .addSvgIcon('chart', sanitizer.bypassSecurityTrustResourceUrl('assets/chart.svg'));
  }

  ngAfterViewInit() {
    this.windowDim = [this.elRef.nativeElement.clientWidth, this.elRef.nativeElement.clientHeight];
  }

  public onAddContent(): void {
    if (this.contents.findIndex((content: Content) => content.name === this.nameCtrl.value) === -1) {
      this.contents.push({
        color: getRandomColor(),
        name: this.nameCtrl.value.toUpperCase(),
        saturation: this.saturation,
        duration: this.duration
      });

      this.saturation = 0;
      this.duration = 1;
      this.nameCtrl.reset();
    }

    this.onAssignContent();
  }

  public onAssignContent(): void {
    const data: PieData = this.playlistService.compute(this.contents);
    if (data) {
      this.colors = { domain: [...data.colors] };
      this.data = [...data.data];
    }

    this.updatePieHeight();
  }

  public onChangeMode() {
    this.isDoughnut = !this.isDoughnut;
    this.playlistService.compute(this.contents);
  }

  public onRemoveContent(_content: Content): void {
    this.contents = this.contents.filter((content: Content) => content.name !== _content.name);
    this.onAssignContent();
  }

  private updatePieHeight() {
    let height = 0;
    try {
      if (this.contents.length === 0) {
        height = 0;
      } else {
        height = this.windowDim[1] - 30 - this.chips.nativeElement.clientHeight - this.control.nativeElement.clientHeight;
      }
    } finally {
      this.pieHeight = height;
    }
  }
}
