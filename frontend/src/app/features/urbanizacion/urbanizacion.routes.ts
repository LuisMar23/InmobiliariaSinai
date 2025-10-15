import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AuthGuard } from "../../core/guards/auth.guard";
import { UrbanizacionList } from "./components/urbanizacion-list/urbanizacion-list";

const routes:Routes=[
    {path:'',component:UrbanizacionList,canActivate:[AuthGuard]},

    
  
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UrbanizacionRoutingModule{}