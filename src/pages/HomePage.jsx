import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/Sidebar/AppSidebar";
import Dashboard from "@/components/Dashboard/Dashboard";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { db } from "../config/firebase_config";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import dayjs from "dayjs";
import { PinIcon, FileCheck, Hourglass } from "lucide-react";

export default function HomePage() {
  const [tasksToday, setTasksToday] = useState([]);
  const [tasksCompletedToday, setTasksCompletedToday] = useState([]);
  const [tasksOverdue, setTasksOverdue] = useState([]);

  useEffect(() => {
    const today = dayjs().format("YYYY-MM-DD");
    const tasksRef = collection(db, "tasks");

    // 🔹 Écouter les tâches à faire aujourd’hui en temps réel
    const tasksQuery = query(
      tasksRef,
      where("dueDate", "==", today),
      where("completed", "==", false)
    );
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      setTasksToday(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    });

    // 🔹 Écouter les tâches accomplies aujourd’hui en temps réel
    const completedQuery = query(tasksRef, where("completedAt", "==", today));
    const unsubscribeCompleted = onSnapshot(completedQuery, (snapshot) => {
      setTasksCompletedToday(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    });

    // 🔹 Écouter les tâches en retard en temps réel
    const overdueQuery = query(
      tasksRef,
      where("dueDate", "<", today),
      where("completed", "==", false)
    );
    const unsubscribeOverdue = onSnapshot(overdueQuery, (snapshot) => {
      setTasksOverdue(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    });

    //  Nettoyer les abonnements Firestore quand le composant est démonté
    return () => {
      unsubscribeTasks();
      unsubscribeCompleted();
      unsubscribeOverdue();
    };
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">Dashboard</BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            {/*  Tâches à faire aujourd’hui */}
            <div className="aspect-video rounded-xl bg-white shadow-md p-4 flex flex-col items-center justify-center">
              <PinIcon color="#4E78F2" className="mb-3"></PinIcon>
              <h2 className="text-sm font-light mb-2">À faire aujourd’hui</h2>
              <p className="text-2xl font-bold">{tasksToday.length}</p>
            </div>

            {/*  Tâches accomplies aujourd’hui */}
            <div className="aspect-video rounded-xl bg-white shadow-md p-4 flex flex-col items-center justify-center">
              <FileCheck color="#1D9F64" className="mb-3"></FileCheck>
              <h2 className="text-sm font-light mb-2">Tâches accomplies</h2>
              <p className="text-2xl font-bold">{tasksCompletedToday.length}</p>
            </div>

            {/*  Tâches en retard */}
            <div className="aspect-video rounded-xl  bg-white shadow-md p-4 flex flex-col items-center justify-center">
              <Hourglass color="#E17E23" className="mb-3"></Hourglass>
              <h2 className="text-sm font-light mb-2">En retard</h2>
              <p className="text-2xl font-bold">{tasksOverdue.length}</p>
            </div>
          </div>

          {/*  Ajout du Dashboard ici */}
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
            <Dashboard />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
