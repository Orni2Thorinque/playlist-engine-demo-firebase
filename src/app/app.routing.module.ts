import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

export const LOGIN_PATH = 'login';
export const PASSWORD_STREGTH = 'passtrength';

export const routes: Routes = [ ];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule { }
