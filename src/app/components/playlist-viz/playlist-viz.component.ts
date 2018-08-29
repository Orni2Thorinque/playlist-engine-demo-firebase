import { Component, ViewChild, ViewChildren, QueryList, ElementRef, AfterViewInit, HostListener, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';

import { MatIconRegistry, MatSlideToggleChange } from '@angular/material';

import { PlaylistVizService } from './playlist-viz.service';
import { ForceDirectedGraphComponent } from '@swimlane/ngx-charts';

import { Link, ForceMapData, PieData } from './playlist-viz.models';
import { Content } from '../../shared/models/content.model';
import { getRandomColor } from '../../shared/utils/color.utils';

@Component({
  selector: 'app-playlist-viz',
  templateUrl: './playlist-viz.component.html',
  styleUrls: ['./playlist-viz.component.css']
})
export class PlaylistVizComponent implements OnInit, AfterViewInit {
  public windowDim: [number, number] = [0, 0];
  get pieWidth() {
    return this.windowDim[0] - 20;
  }

  public pieHeight = 0;

  public nameCtrl = new FormControl(null, Validators.required);
  public contents: Content[] = [];

  public isDoughnut = false;
  public editedContent: Content;
  public saturation = 1;
  public duration = 1;

  public pieData: { name: string, value: number }[];
  public pieColors: { domain: string[] };

  public forceMapData: { value: string }[];
  public forceMapColors: { domain: string[] };
  public forceMapLinks: Link[] = [];
  private nodeSelect: Content[] = [];
  private circleNode;

  public isSeperate = false;
  public isSelfSeperate = false;

  public loading = false;

  @ViewChild('contentInput') contentInput: ElementRef;
  @ViewChild('chips') chips: ElementRef;
  @ViewChild('control') control: ElementRef;
  @ViewChild('pie') pie: ElementRef;
  @ViewChild('forceMap') forceMap: ForceDirectedGraphComponent;

  @HostListener('window:resize', ['$event'])
  private onResize(event: Event) {
    this.windowDim = [this.elRef.nativeElement.clientWidth, this.elRef.nativeElement.clientHeight - 50];
  }

  constructor(private playlistService: PlaylistVizService, private elRef: ElementRef,
    iconRegistry: MatIconRegistry, sanitizer: DomSanitizer) {
    iconRegistry.addSvgIcon('add', sanitizer.bypassSecurityTrustResourceUrl('assets/add.svg'))
      .addSvgIcon('cancel', sanitizer.bypassSecurityTrustResourceUrl('assets/cancel.svg'))
      .addSvgIcon('donut', sanitizer.bypassSecurityTrustResourceUrl('assets/donut.svg'))
      .addSvgIcon('lines', sanitizer.bypassSecurityTrustResourceUrl('assets/lines.svg'))
      .addSvgIcon('play', sanitizer.bypassSecurityTrustResourceUrl('assets/play.svg'))
      .addSvgIcon('settings', sanitizer.bypassSecurityTrustResourceUrl('assets/settings.svg'))
      .addSvgIcon('contents', sanitizer.bypassSecurityTrustResourceUrl('assets/contents.svg'))
      .addSvgIcon('chart', sanitizer.bypassSecurityTrustResourceUrl('assets/chart.svg'));

    this.contents = this.playlistService.restore();
    if (this.contents) {
      const forceMapData: ForceMapData = this.playlistService.computeForceMap(this.contents);
      this.forceMapData = [...forceMapData.data];
      this.forceMapColors = { domain: [...forceMapData.colors] };
      this.forceMapLinks = forceMapData.links;
    }
  }

  ngOnInit() { }

  ngAfterViewInit() {
    this.windowDim = [this.elRef.nativeElement.clientWidth, this.elRef.nativeElement.clientHeight - 50];
    setTimeout(() => {
      const seperation = this.playlistService.seperationRestore();
      this.isSeperate = seperation.ext;
      this.isSelfSeperate = seperation.auto;
      this.playlistService.changeSeperationMode('auto', this.isSelfSeperate);
      this.playlistService.changeSeperationMode('ext', this.isSeperate);
    }, 200);
  }

  public onCompute() {
    this.loading = true;
    const pieData: PieData = this.playlistService.compute(this.contents);
    if (pieData) {
      this.pieColors = { domain: [...pieData.colors] };
      this.pieData = [...pieData.data];
    }
    setTimeout(() => this.loading = false, 200);
  }

  public onAddContent(): void {
    if (this.contents.findIndex((content: Content) => content.name === this.nameCtrl.value) === -1) {
      this.contents.push({
        color: getRandomColor(),
        name: this.nameCtrl.value.toUpperCase(),
        saturation: this.saturation,
        duration: this.duration,
        separation: [this.nameCtrl.value.toUpperCase()]
      });

      this.saturation = 1;
      this.duration = 1;
      this.nameCtrl.reset();
    }

    this.onAssignContent();
  }

  public onAssignContent(): void {
    this.playlistService.store(this.contents);

    this.loading = true;

    const forceMapData: ForceMapData = this.playlistService.computeForceMap(this.contents);
    this.forceMapData = [...forceMapData.data];
    this.forceMapColors = { domain: [...forceMapData.colors] };
    this.forceMapLinks = forceMapData.links;

    this.loading = false;
    this.updatePieHeight();
  }

  public onChangeMode() {
    this.isDoughnut = !this.isDoughnut;
    // if (!this.pieData) {
    //   const data: PieData = this.playlistService.compute(this.contents);
    //   if (data) {
    //     this.pieColors = { domain: [...data.colors] };
    //     this.pieData = [...data.data];
    //     this.updatePieHeight();
    //   }
    // }
  }

  public onRemoveContent(_content: Content): void {
    this.contents = this.contents.filter((content: Content) => content.name !== _content.name);
    this.contents.forEach((c: Content) => {
      c.separation = c.separation.filter((seperation: string) => seperation !== _content.name);
    });

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

  /** Force map node click handler
   * @param event Click event
   */
  public onSelectNode(event: any): void {
    if (this.nodeSelect[0]) { // Second node select
      if (this.nodeSelect[0].name !== event.name) {
        this.nodeSelect[1] = this.contents.find((c: Content) => c.name === event.name);

        const link: Link = {
          source: this.nodeSelect[0].name,
          target: this.nodeSelect[1].name
        };

        let index = -1;
        this.forceMapLinks.forEach((l: any, i: number) => {
          if ((link.source === l.source.value || link.source === l.target.value) &&
            (link.target === l.source.value || link.target === l.target.value)) {
            index = i;
          }
        });

        if (index > -1) {
          this.forceMapLinks.splice(index, 1);
          this.updateSeperation(false, link);
        } else {
          this.forceMapLinks.push(link);
          this.updateSeperation(true, link);
        }
        this.forceMapLinks = [...this.forceMapLinks];
      }

      this.nodeSelect = [];
    } else { // First node select
      this.nodeSelect[0] = this.contents.find((c: Content) => c.name === event.name);
    }
  }

  /** Add/Remove link and update content model
   * @param add Whether we are adding or removing a link
   * @param separation given link
   */
  private updateSeperation(add: boolean, separation: Link): void {
    const source = this.contents.find((c: Content) => c.name === separation.source);
    const target = this.contents.find((c: Content) => c.name === separation.target);

    if (add) { // IF: Add seperation
      if (source.separation.indexOf(separation.target) === -1) {
        source.separation.push(separation.target);
      }
      if (target.separation.indexOf(separation.source) === -1) {
        target.separation.push(separation.source);
      }
    } else { // ELSE: Remove seperation
      const index1 = source.separation.indexOf(separation.target);
      if (index1 > -1) {
        source.separation.splice(index1, 1);
      }

      const index2 = target.separation.indexOf(separation.source);
      if (index2 > -1) {
        target.separation.splice(index2, 1);
      }
    }

    this.playlistService.store(this.contents);
  }

  /** Forcemap graph click handler to focus/unfocus clicked link
   * @param event given click event
   */
  public onTargetNode(event) {
    if (event.target.attributes['r']) {
      if (this.circleNode) {
        this.circleNode.attributes['r'].nodeValue = 5;
        this.circleNode = event.target;
      }

      this.circleNode = event.target;
      this.circleNode.attributes['r'].nodeValue = 7;
    } else {
      if (this.circleNode) {
        this.circleNode.attributes['r'].nodeValue = 5;
        this.circleNode = null;
        this.nodeSelect = [null, null];
      }
    }
  }

  /** (Self) Seperation toggle event handler
   * @param type given seperation type (auto = self seperation, ext = seperation)
   * @param change given slide toggle event
   */
  public onChangeSeperation(type: 'auto' | 'ext', change: MatSlideToggleChange): void {
    const seperate = change.checked;
    this.playlistService.changeSeperationMode(type, seperate);
  }
}
