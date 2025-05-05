import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Edit, Trash, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Manage Categories",
  description: "Manage evaluation categories for your QA criteria.",
};

export default async function CategoriesPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Get the criteria with categories
  const criteria = await db.qACriteria.findUnique({
    where: { id: params.id },
    include: {
      categories: {
        include: {
          _count: {
            select: {
              metrics: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!criteria) {
    return notFound();
  }

  // Check if user has access to this criteria
  if (session.user.role !== "ADMIN" && criteria.createdById !== session.user.id) {
    // Check if user is in the team
    if (criteria.teamId) {
      const userTeam = await db.teamMember.findFirst({
        where: {
          userId: session.user.id,
          teamId: criteria.teamId,
        },
      });

      if (!userTeam) {
        return notFound();
      }
    } else if (!criteria.isPublic) {
      return notFound();
    }
  }

  // Calculate total weight
  const totalWeight = criteria.categories.reduce((sum, category) => sum + category.weight, 0);

  return (
    <DashboardShell>
      <DashboardHeader
        heading={`Categories for ${criteria.name}`}
        text="Manage evaluation categories for your QA criteria."
      >
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/criteria/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Criteria
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/criteria/${params.id}/categories/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Link>
          </Button>
        </div>
      </DashboardHeader>

      <div className="grid gap-6">
        {/* Weight Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Category Weights</CardTitle>
            <CardDescription>
              The total weight of all categories should equal 100%.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span>Total Weight:</span>
              <Badge variant={totalWeight === 100 ? "default" : "destructive"}>
                {totalWeight}%
              </Badge>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                {criteria.categories.map((category, index) => (
                  <div
                    key={category.id}
                    className="h-full float-left"
                    style={{
                      width: `${category.weight}%`,
                      backgroundColor: getColorForIndex(index),
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {criteria.categories.map((category, index) => (
                  <div key={category.id} className="flex items-center text-sm">
                    <div
                      className="w-3 h-3 rounded-full mr-1"
                      style={{ backgroundColor: getColorForIndex(index) }}
                    />
                    <span>{category.name}: {category.weight}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {criteria.categories.map((category) => (
            <Card key={category.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <CardDescription>
                  {category.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2 pt-0 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground">Weight</p>
                    <p className="font-medium">{category.weight}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Metrics</p>
                    <p className="font-medium">{category._count.metrics}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(category.createdAt)}</p>
                </div>
              </CardContent>
              <CardFooter className="mt-auto pt-4">
                <div className="flex w-full justify-between">
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/criteria/${params.id}/categories/${category.id}`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <div className="flex space-x-2">
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/criteria/${params.id}/categories/${category.id}/metrics`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Metrics
                      </Link>
                    </Button>
                    <Button variant="outline" size="icon" className="text-destructive">
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
          {criteria.categories.length === 0 && (
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>No categories found</CardTitle>
                <CardDescription>
                  You haven't created any categories for this criteria yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  Create your first category to start defining evaluation metrics.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link href={`/dashboard/criteria/${params.id}/categories/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

// Helper function to get a color for a category based on its index
function getColorForIndex(index: number): string {
  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
    "#6366f1", // indigo
  ];
  
  return colors[index % colors.length];
}
