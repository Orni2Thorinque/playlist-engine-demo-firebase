import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';

import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';

import { NgxChartsModule } from '@swimlane/ngx-charts';

import { NgxLocalStorageModule } from 'ngx-localstorage';

import {
    MatBadgeModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatRippleModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
} from '@angular/material';

import { PlaylistVizComponent } from '../../components/playlist-viz/playlist-viz.component';
import { PlaylistVizService } from '../../components/playlist-viz/playlist-viz.service';
import { CdkTreeModule } from '@angular/cdk/tree';
import { CdkTableModule } from '@angular/cdk/table';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '../../../../node_modules/@angular/common';

@NgModule({
    declarations: [
        PlaylistVizComponent,
    ],
    imports: [
        CommonModule,
        BrowserAnimationsModule,
        ReactiveFormsModule,
        FormsModule,
        FlexLayoutModule,
        HttpClientModule,

        NgxChartsModule,

        NgxLocalStorageModule.forRoot({
            prefix: 'ple'
        }),

        CdkTableModule,
        CdkTreeModule,
        MatBadgeModule,
        MatButtonModule,
        MatCardModule,
        MatDialogModule,
        MatIconModule,
        MatInputModule,
        MatProgressBarModule,
        MatRippleModule,
        MatSliderModule,
        MatSlideToggleModule,
        MatTabsModule,
        MatToolbarModule,
        MatTooltipModule
    ],
    exports: [PlaylistVizComponent],
    providers: [PlaylistVizService],
    bootstrap: [PlaylistVizComponent],
    entryComponents: []
})
export class PlaylistVizModule { }
